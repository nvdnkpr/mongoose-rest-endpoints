// Generated by CoffeeScript 1.6.3
(function() {
  var Endpoint, Q, httperror, mongoose, _;

  mongoose = require('mongoose');

  Q = require('q');

  httperror = require('./httperror');

  _ = require('underscore');

  Endpoint = (function() {
    function Endpoint(path, model, opts) {
      this.path = path;
      this.modelClass = model;
      if (opts == null) {
        opts = {};
      }
      this.to_populate = opts.populate != null ? opts.populate : [];
      this.query_vars = opts.query_vars != null ? opts.query_vars : [];
      this.suggestion = opts.suggestion;
      this.ignore = opts.ignore != null ? opts.ignore : [];
      this.middleware = {
        get: [],
        post: [],
        put: [],
        "delete": []
      };
    }

    Endpoint.prototype.cleanData = function(data, req) {
      var key, obj, val, _i, _len;
      delete data._id;
      for (key in data) {
        val = data[key];
        if (val && key.substr(0, 1) === '_' && val instanceof Array) {
          console.log('cleaning data for ', key, val);
          data[key] = new Array();
          for (_i = 0, _len = val.length; _i < _len; _i++) {
            obj = val[_i];
            if (typeof obj === 'object') {
              data[key].push(obj._id);
            } else {
              data[key].push(obj);
            }
          }
        } else if (val && key.substr(0, 1) === '_' && typeof val === 'object') {
          data[key] = val._id;
        } else if (val && key.substr(0, 1) === '_' && typeof val === 'array') {

        } else if (val && typeof val === 'object') {
          data[key] = this.cleanData(val, req);
        }
      }
      return data;
    };

    Endpoint.prototype.post = function(req) {
      var data, deferred, model;
      deferred = Q.defer();
      data = this.cleanData(req.body, req);
      model = new this.modelClass(data);
      /*@handleRelations(req).then ->*/

      model.save(function(err) {
        if (err) {
          console.error(err);
          return deferred.reject(httperror.forge('Failure to create document', 400));
        } else {
          return deferred.resolve(model.toObject());
        }
      });
      /*, (err) ->
      			deferred.reject(httperror.forge('Failure to create document', 400))
      */

      return deferred.promise;
    };

    Endpoint.prototype.get = function(req) {
      var deferred, err, id, pop, query, _i, _len, _ref,
        _this = this;
      deferred = Q.defer();
      id = req.params.id;
      if (!id) {
        err = httperror.forge('ID not provided', 400);
        deferred.reject(err);
      } else {
        query = this.modelClass.findById(id);
        if (this.to_populate.length) {
          _ref = this.to_populate;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            pop = _ref[_i];
            query.populate(pop);
          }
        }
        query.exec(function(err, model) {
          var doc, field, _j, _len1, _ref1;
          if (err) {
            return deferred.reject(httperror.forge('Error retrieving document', 500));
          } else if (!model) {
            return deferred.reject(httperror.forge('Could not find document', 404));
          } else {
            doc = model.toObject();
            if (_this.ignore.length) {
              _ref1 = _this.ignore;
              for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                field = _ref1[_j];
                delete doc[field];
              }
            }
            return deferred.resolve(doc);
          }
        });
      }
      return deferred.promise;
    };

    Endpoint.prototype.populate = function(model, rel) {
      var deferred;
      deferred = Q.defer();
      model.populate(rel, function(err, model) {
        if (err) {
          return deferred.reject(err);
        } else {
          return deferred.resolve(model);
        }
      });
      return deferred.promise;
    };

    Endpoint.prototype.put = function(req) {
      var data, deferred, id, query,
        _this = this;
      deferred = Q.defer();
      id = req.params.id;
      if (!id) {
        deferred.reject(httperror.forge('ID not provided', 400));
      } else {
        console.log('cleaning data:', req.body);
        data = this.cleanData(req.body, req);
        console.log('cleaned data', data);
        query = this.modelClass.findById(id);
        console.log('should be populating', this.populate);
        query.exec(function(err, model) {
          var key, val;
          if (err || !model) {
            console.log(err);
            return deferred.reject(httperror.forge('Error retrieving document', 404));
          } else {
            for (key in data) {
              val = data[key];
              model[key] = val;
            }
            return model.save(function(err, model) {
              var pop, populates, _i, _len, _ref;
              populates = [];
              if (_this.to_populate.length) {
                _ref = _this.to_populate;
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                  pop = _ref[_i];
                  console.log('populating', pop);
                  populates.push(_this.populate(model, pop));
                }
              }
              return Q.all(populates).then(function() {
                return deferred.resolve(model);
              }, function(err) {
                console.log(err);
                return deferred.reject(httperror.forge('Failure to update document', 500));
              });
            });
          }
        });
      }
      return deferred.promise;
    };

    Endpoint.prototype["delete"] = function(req) {
      var deferred, id;
      deferred = Q.defer();
      id = req.params.id;
      if (!id) {
        deferred.reject(httperror.forge('ID not provided', 400));
      } else {
        this.modelClass.findByIdAndRemove(id, function(err, model) {
          if (err) {
            return deferred.reject(httperror.forge('Error deleting document', 500));
          } else if (!model) {
            return deferred.reject(httperror.forge('Document not found', 404));
          } else {
            return deferred.resolve();
          }
        });
      }
      return deferred.promise;
    };

    Endpoint.prototype.list = function(req) {
      var deferred, filter, pop, query, query_var, _i, _j, _len, _len1, _ref, _ref1,
        _this = this;
      deferred = Q.defer();
      filter = {};
      if (this.query_vars) {
        _ref = this.query_vars;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          query_var = _ref[_i];
          if (req.query[query_var] && (_.isString(req.query[query_var]) || req.query[query_var] instanceof Date)) {
            if (query_var.substr(0, 4) === '$lt_') {
              filter[query_var.replace('$lt_', '')] = {
                $lt: req.query[query_var]
              };
            } else if (query_var.substr(0, 5) === '$lte_') {
              filter[query_var.replace('$lte_', '')] = {
                $lte: req.query[query_var]
              };
            } else if (query_var.substr(0, 4) === '$gt_') {
              filter[query_var.replace('$gt_', '')] = {
                $gt: req.query[query_var]
              };
            } else if (query_var.substr(0, 5) === '$gte_') {
              filter[query_var.replace('$gte_', '')] = {
                $gte: req.query[query_var]
              };
            } else if (query_var.substr(0, 4) === '$in_') {
              filter[query_var.replace('$in_', '')] = {
                $in: req.query[query_var]
              };
            } else {
              filter[query_var] = req.query[query_var];
            }
          } else {
            console.log('bad query var:', query_var);
          }
        }
      }
      query = this.modelClass.find(filter);
      if (this.to_populate.length) {
        _ref1 = this.to_populate;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          pop = _ref1[_j];
          query.populate(pop);
        }
      }
      query.exec(function(err, collection) {
        var field, key, obj, _k, _l, _len2, _len3, _ref2;
        if (_this.ignore.length) {
          for (key = _k = 0, _len2 = collection.length; _k < _len2; key = ++_k) {
            obj = collection[key];
            obj = obj.toObject();
            _ref2 = _this.ignore;
            for (_l = 0, _len3 = _ref2.length; _l < _len3; _l++) {
              field = _ref2[_l];
              delete obj[field];
            }
            collection[key] = obj;
          }
        }
        if (err) {
          return deferred.reject(httperror.forge('Could not retrieve collection', 500));
        } else {
          return deferred.resolve(collection);
        }
      });
      return deferred.promise;
    };

    Endpoint.prototype.getSuggestions = function(req) {
      var deferred, params,
        _this = this;
      console.log('getting suggestions...');
      deferred = Q.defer();
      if (this.suggestion.forgeQuery) {
        params = this.suggestion.forgeQuery(req);
      } else {
        params = null;
      }
      this.modelClass.find(params, function(err, results) {
        var final, obj, res, _i, _len;
        if (err) {
          console.error(err);
          return deferred.reject(httperror.forge('Error fetching results', 500));
        } else {
          final = [];
          for (_i = 0, _len = results.length; _i < _len; _i++) {
            res = results[_i];
            obj = {
              id: res._id,
              value: _this.suggestion.getLabel(res),
              tokens: _this.suggestion.getTokens(res)
            };
            final.push(obj);
          }
          return deferred.resolve(final);
        }
      });
      return deferred.promise;
    };

    Endpoint.prototype.addMiddleware = function(method, middleware) {
      var m, _i, _j, _len, _len1, _ref;
      if (method === 'all') {
        _ref = ['get', 'post', 'put', 'delete'];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          m = _ref[_i];
          this.addMiddleware(m, middleware);
        }
      } else {
        if (middleware instanceof Array) {
          for (_j = 0, _len1 = middleware.length; _j < _len1; _j++) {
            m = middleware[_j];
            this.addMiddleware(method, m);
          }
        } else {
          this.middleware[method].push(middleware);
        }
      }
      return this;
    };

    Endpoint.prototype.register = function(app) {
      var _this = this;
      if (this.suggestion) {
        app.get(this.path + '/suggestion', this.middleware.get, function(req, res) {
          return Q(_this.getSuggestions(req)).then(function(results) {
            return res.send(results, 200);
          }, function(error) {
            return res.send(error.message, error.code);
          });
        });
      }
      app.get(this.path + '/:id', this.middleware.get, function(req, res) {
        return Q(_this.get(req)).then(function(results) {
          return res.send(results, 200);
        }, function(error) {
          return res.send(error.message, error.code);
        });
      });
      app.get(this.path, this.middleware.get, function(req, res) {
        return Q(_this.list(req)).then(function(results) {
          return res.send(results, 200);
        }, function(error) {
          return res.send(error.message, error.code);
        });
      });
      app.post(this.path, this.middleware.post, function(req, res) {
        return Q(_this.post(req)).then(function(results) {
          return res.send(results, 201);
        }, function(error) {
          return res.send(error.message, error.code);
        });
      });
      app.put(this.path + '/:id', this.middleware.put, function(req, res) {
        return Q(_this.put(req)).then(function(results) {
          return res.send(results, 202);
        }, function(error) {
          return res.send(error.message, error.code);
        });
      });
      return app["delete"](this.path + '/:id', this.middleware["delete"], function(req, res) {
        return Q(_this["delete"](req)).then(function(results) {
          return res.send(results, 200);
        }, function(error) {
          return res.send(error.message, error.code);
        });
      });
    };

    return Endpoint;

  })();

  module.exports = Endpoint;

}).call(this);
