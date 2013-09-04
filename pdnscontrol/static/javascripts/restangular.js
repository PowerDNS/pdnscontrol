/**
 * Restfull Resources service for AngularJS apps
 * @version v1.0.3 - 2013-06-26
 * @link https://github.com/mgonto/restangular
 * @author Martin Gontovnikas <martin@gonto.com.ar>
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
(function(){

var module = angular.module('restangular', []);

module.provider('Restangular', function() {
        // Configuration
        var Configurer = {};
        Configurer.init = function(object, config) {
            /**
             * Those are HTTP safe methods for which there is no need to pass any data with the request.
             */
            var safeMethods= ["get", "head", "options", "trace"];
            config.isSafe = function(operation) {
              return _.contains(safeMethods, operation.toLowerCase());
            }
            /**
             * This is the BaseURL to be used with Restangular
             */
            config.baseUrl = _.isUndefined(config.baseUrl) ? "" : config.baseUrl;
            object.setBaseUrl = function(newBaseUrl) {
                config.baseUrl = newBaseUrl;
            }
            
            /**
             * Sets the extra fields to keep from the parents
             */
            config.extraFields = config.extraFields || [];
            object.setExtraFields = function(newExtraFields) {
                config.extraFields = newExtraFields;
            }

            /**
             * Some default $http parameter to be used in EVERY call
            **/
            config.defaultHttpFields = config.defaultHttpFields || {};
            object.setDefaultHttpFields = function(values) {
              config.defaultHttpFields = values;
            }

            config.withHttpDefaults = function(obj) {
              return _.defaults(obj, config.defaultHttpFields);
            }

            config.defaultRequestParams = config.defaultRequestParams || {};
            object.setDefaultRequestParams = function(values) {
              config.defaultRequestParams = values;
            }

            config.defaultHeaders = config.defaultHeaders || {};
            object.setDefaultHeaders = function(headers) {
              config.defaultHeaders = headers;
            }

            /**
             * Method overriders will set which methods are sent via POST with an X-HTTP-Method-Override
             **/
            config.methodOverriders = config.methodOverriders || [];
            object.setMethodOverriders = function(values) {
              var overriders = _.extend([], values);
              if (config.isOverridenMethod('delete', overriders)) {
                overriders.push("remove");
              }
              config.methodOverriders = overriders;
            }

            config.isOverridenMethod = function(method, values) {
              var search = values || config.methodOverriders;
              return !_.isUndefined(_.find(search, function(one) {
                return one.toLowerCase() === method.toLowerCase();
              }));
            }

            /**
             * Sets the URL creator type. For now, only Path is created. In the future we'll have queryParams
            **/
            config.urlCreator = config.urlCreator || "path";
            object.setUrlCreator = function(name) {
                if (!_.has(config.urlCreatorFactory, name)) {
                    throw new Error("URL Path selected isn't valid");
                }
                config.urlCreator = name;
            }
            
            /**
             * You can set the restangular fields here. The 3 required fields for Restangular are:
             * 
             * id: Id of the element
             * route: name of the route of this element
             * parentResource: the reference to the parent resource
             * 
             *  All of this fields except for id, are handled (and created) by Restangular. By default, 
             *  the field values will be id, route and parentResource respectively
             */
            config.restangularFields = config.restangularFields || {
                id: "id",
                route: "route",
                parentResource: "parentResource",
                restangularCollection: "restangularCollection"
            }
            object.setRestangularFields = function(resFields) {
                config.restangularFields = 
                  _.extend(config.restangularFields, resFields);
            }

            config.setIdToElem = function(elem, id) {
              var properties = config.restangularFields.id.split('.');
              var idValue = elem;
              _.each(_.initial(properties), function(prop) {
                idValue[prop] = {};
                idValue = idValue[prop];
              });
              idValue[_.last(properties)] = id;
            } 

            config.getIdFromElem = function(elem) {
              var properties = config.restangularFields.id.split('.');
              var idValue = angular.copy(elem);
              _.each(properties, function(prop) {
                idValue = idValue[prop];
              });
              return idValue;
            }
            
            /**
             * Sets the Response parser. This is used in case your response isn't directly the data.
             * For example if you have a response like {meta: {'meta'}, data: {name: 'Gonto'}}
             * you can extract this data which is the one that needs wrapping
             *
             * The ResponseExtractor is a function that receives the response and the method executed.
             */
            config.responseExtractor = config.responseExtractor || function(response) {
                return response;
            }
            object.setResponseExtractor = function(extractor) {
                config.responseExtractor = extractor;
            }
            
            object.setResponseInterceptor = object.setResponseExtractor;
            
            /**
             * Request interceptor is called before sending an object to the server.
             */
            config.fullRequestInterceptor = config.fullRequestInterceptor || function(element, operation, 
              path, url, headers, params) {
                return {
                  element: element, 
                  headers: headers,
                  params: params
                };
            } 
            
            object.setRequestInterceptor = function(interceptor) {
                config.fullRequestInterceptor = function(elem, operation, path, url, headers, params) {
                  return {
                    headers: headers,
                    params: params,
                    element: interceptor(elem, operation, path, url)
                  }
                };
            }

            object.setFullRequestInterceptor = function(interceptor) {
                config.fullRequestInterceptor = interceptor;
            }

            

            config.errorInterceptor = config.errorInterceptor || function() {};

            object.setErrorInterceptor = function(interceptor) {
              config.errorInterceptor = interceptor;
            }
            
            /**
             * This method is called after an element has been "Restangularized".
             * 
             * It receives the element, a boolean indicating if it's an element or a collection 
             * and the name of the model
             * 
             */
            config.onElemRestangularized = config.onElemRestangularized || function(elem) {
                return elem;
            }
            object.setOnElemRestangularized = function(post) {
                config.onElemRestangularized = post;
            }

            /**
             * Depracated. Don't use this!!
             */
            object.setListTypeIsArray = function(val) {
                
            };
            
            /**
             * This lets you set a suffix to every request.
             * 
             * For example, if your api requires that for JSon requests you do /users/123.json, you can set that
             * in here.
             * 
             * 
             * By default, the suffix is null
             */
            config.suffix = _.isUndefined(config.suffix) ? null : config.suffix;
            object.setRequestSuffix = function(newSuffix) {
                config.suffix = newSuffix;
            }
            
            /**
             * Add element transformers for certain routes.
             */
            config.transformers = config.transformers || {};
            object.addElementTransformer = function(type, secondArg, thirdArg) {
                var isCollection = null;
                var transformer = null;
                if (arguments.length === 2) {
                    transformer = secondArg;
                } else {
                    transformer = thirdArg;
                    isCollection = secondArg;
                }
                
                var typeTransformers = config.transformers[type];
                if (!typeTransformers) {
                    typeTransformers = config.transformers[type] = [];
                }
                
                typeTransformers.push(function(coll, elem) {
                    if (_.isNull(isCollection) || (coll == isCollection)) {
                        return transformer(elem);
                    }
                    return elem;
                });
            }
            
            config.transformElem = function(elem, isCollection, route, Restangular) {
                var typeTransformers = config.transformers[route];
                var changedElem = elem;
                if (typeTransformers) {
                    _.each(typeTransformers, function(transformer) {
                       changedElem = transformer(isCollection, changedElem); 
                    });
                }
                return config.onElemRestangularized(changedElem, 
                  isCollection, route, Restangular);
            }
            
            config.fullResponse = _.isUndefined(config.fullResponse) ? false : config.fullResponse;
            object.setFullResponse = function(full) {
                config.fullResponse = full;
            }
            
            
            
            //Internal values and functions
            config.urlCreatorFactory = {};

            /**
             * Base URL Creator. Base prototype for everything related to it
             **/

             var BaseCreator = function() {
             };

             BaseCreator.prototype.setConfig = function(config) {
                 this.config = config;
             }

             BaseCreator.prototype.parentsArray = function(current) {
                var parents = [];
                while(current) {
                    parents.push(current);
                    current = current[this.config.restangularFields.parentResource];
                }
                return parents.reverse();
            }

            function RestangularResource($http, url, configurer) {
              var resource = {};
              _.each(_.keys(configurer), function(key) {
                  var value = configurer[key];

                  // We don't want the ? if no params are there
                  if (_.isEmpty(value.params)) {
                    delete value.params;
                  }

                  if (config.isSafe(value.method)) {
                      
                      resource[key] = function() {
                          return $http(_.extend(value, {
                              url: url
                          }));
                      }
                      
                  } else {
                      
                      resource[key] = function(data) {
                          return $http(_.extend(value, {
                              url: url,
                              data: data
                          }));
                      }
                      
                  }
              });
              
              return resource;
            }

            BaseCreator.prototype.resource = function(current, $http, callHeaders, callParams, what) {
                
                var params = _.defaults(callParams || {}, this.config.defaultRequestParams);
                var headers = _.defaults(callHeaders || {}, this.config.defaultHeaders);
                
                var url = this.base(current);
                url += what ? ("/" +  what): '';
                url += (this.config.suffix || '');

                return RestangularResource($http, url, {
                    getList: this.config.withHttpDefaults({method: 'GET',
                      params: params,
                      headers: headers || {}}),

                    get: this.config.withHttpDefaults({method: 'GET',
                      params: params,
                      headers: headers || {}}),

                    put: this.config.withHttpDefaults({method: 'PUT',
                      params: params,
                      headers: headers || {}}),

                    post: this.config.withHttpDefaults({method: 'POST',
                      params: params,
                      headers: headers || {}}),

                    remove: this.config.withHttpDefaults({method: 'DELETE',
                      params: params,
                      headers: headers || {}}),

                    head: this.config.withHttpDefaults({method: 'HEAD',
                      params: params,
                      headers: headers || {}}),

                    trace: this.config.withHttpDefaults({method: 'TRACE',
                      params: params,
                      headers: headers || {}}),

                    options: this.config.withHttpDefaults({method: 'OPTIONS',
                      params: params,
                      headers: headers || {}}),

                    patch: this.config.withHttpDefaults({method: 'PATCH',
                      params: params,
                      headers: headers || {}})
                });
            }
            
            /**
             * This is the Path URL creator. It uses Path to show Hierarchy in the Rest API.
             * This means that if you have an Account that then has a set of Buildings, a URL to a building
             * would be /accounts/123/buildings/456
            **/
            var Path = function() {
            };

            Path.prototype = new BaseCreator();
            
            Path.prototype.base = function(current) {
                var __this = this;
                return this.config.baseUrl + _.reduce(this.parentsArray(current), function(acum, elem) {
                    var currUrl = acum + "/" + elem[__this.config.restangularFields.route];
                    
                    if (!elem[__this.config.restangularFields.restangularCollection]) {
                        var elemId = __this.config.getIdFromElem(elem);
                        if (elemId) {
                            currUrl += "/" + elemId;
                        }
                    }

                    return currUrl;
                }, '');
            }
            

            
            Path.prototype.fetchUrl = function(current, what) {
                var baseUrl = this.base(current);
                if (what) {
                    baseUrl += "/" + what;
                }
                return baseUrl;
            }
            

            
            config.urlCreatorFactory.path = Path;

        }

        var globalConfiguration = {};

        Configurer.init(this, globalConfiguration);

        
        
        
       this.$get = ['$http', '$q', function($http, $q) {

          function createServiceForConfiguration(config) {
              var service = {};

              var urlHandler = new config.urlCreatorFactory[config.urlCreator]();
              urlHandler.setConfig(config);

              function restangularizeBase(parent, elem, route) {
                  elem[config.restangularFields.route] = route;
                  elem.getRestangularUrl = _.bind(urlHandler.fetchUrl, urlHandler, elem);
                  elem.addRestangularMethod = _.bind(addRestangularMethodFunction, elem);
                  
                  // RequestLess connection
                  elem.one = _.bind(one, elem, elem);
                  elem.all = _.bind(all, elem, elem);
                  
                  if (parent) {
                      var restangularFieldsForParent = _.union(
                        _.values( _.pick(config.restangularFields, ['id', 'route', 'parentResource']) ),
                        config.extraFields
                      );
                      elem[config.restangularFields.parentResource] = _.pick(parent, restangularFieldsForParent);
                  } else {
                    elem[config.restangularFields.parentResource] = null;
                  }
                  return elem;
              }
              

              
              function one(parent, route, id) {
                  var elem = {};
                  config.setIdToElem(elem, id);
                  return restangularizeElem(parent, elem , route);
              }


              function all(parent, route) {
                  return restangularizeCollection(parent, {} , route, true);
              }
              // Promises
              function restangularizePromise(promise, isCollection) {
                  promise.call = _.bind(promiseCall, promise);
                  promise.get = _.bind(promiseGet, promise);
                  promise[config.restangularFields.restangularCollection] = isCollection;
                  if (isCollection) {
                      promise.push = _.bind(promiseCall, promise, "push");
                  }
                  return promise;
              }
              
              function promiseCall(method) {
                  var deferred = $q.defer();
                  var callArgs = arguments;
                  this.then(function(val) {
                      var params = Array.prototype.slice.call(callArgs, 1);
                      var func = val[method];
                      func.apply(val, params);
                      deferred.resolve(val);
                  });
                  return restangularizePromise(deferred.promise, this[config.restangularFields.restangularCollection]);
              }
              
              function promiseGet(what) {
                  var deferred = $q.defer();
                  this.then(function(val) {
                      deferred.resolve(val[what]);
                  });
                  return restangularizePromise(deferred.promise, this[config.restangularFields.restangularCollection]);
              }

              function resolvePromise(deferred, response, data) {
                if (config.fullResponse) {
                  return deferred.resolve(_.extend(response, {
                    data: data
                  }));
                } else {
                  deferred.resolve(data);
                }
              }
              
              
              // Elements

              function stripRestangular(elem) {
                return _.omit(elem, _.values(_.omit(config.restangularFields, 'id')));
              }

              function addCustomOperation(elem) {
                  elem.customOperation = _.bind(customFunction, elem);
                  _.each(["put", "post", "get", "delete"], function(oper) {
                      _.each(["do", "custom"], function(alias) {
                          var callOperation = oper === 'delete' ? 'remove' : oper;
                          var name = alias + oper.toUpperCase();
                          elem[name] = _.bind(customFunction, elem, callOperation);
                      });
                  });
                  elem.customGETLIST = _.bind(fetchFunction, elem);
                  elem.doGETLIST = elem.customGETLIST;
              }
              
              function copyRestangularizedElement(fromElement) {
                  var copiedElement = angular.copy(fromElement);
                  return restangularizeElem(copiedElement[config.restangularFields.parentResource], 
                          copiedElement, copiedElement[config.restangularFields.route]);
              }
              
              function restangularizeElem(parent, elem, route) {
                  var localElem = restangularizeBase(parent, elem, route);
                  localElem[config.restangularFields.restangularCollection] = false;
                  localElem.get = _.bind(getFunction, localElem);
                  localElem.getList = _.bind(fetchFunction, localElem);
                  localElem.put = _.bind(putFunction, localElem);
                  localElem.post = _.bind(postFunction, localElem);
                  localElem.remove = _.bind(deleteFunction, localElem);
                  localElem.head = _.bind(headFunction, localElem);
                  localElem.trace = _.bind(traceFunction, localElem);
                  localElem.options = _.bind(optionsFunction, localElem);
                  localElem.patch = _.bind(patchFunction, localElem);
                  
                  addCustomOperation(localElem);
                  return config.transformElem(localElem, false, route, service);
              }
              
              function restangularizeCollection(parent, elem, route) {
                  var localElem = restangularizeBase(parent, elem, route);
                  localElem[config.restangularFields.restangularCollection] = true;
                  localElem.post = _.bind(postFunction, localElem, null);
                  localElem.head = _.bind(headFunction, localElem);
                  localElem.trace = _.bind(traceFunction, localElem);
                  localElem.putElement = _.bind(putElementFunction, localElem);
                  localElem.options = _.bind(optionsFunction, localElem);
                  localElem.patch = _.bind(patchFunction, localElem);
                  localElem.getList = _.bind(fetchFunction, localElem, null);
                  
                  addCustomOperation(localElem);
                  return config.transformElem(localElem, true, route, service);
              }
              
              function putElementFunction(idx, params, headers) {
                  var __this = this;
                  var elemToPut = this[idx];
                  var deferred = $q.defer();
                  elemToPut.put(params, headers).then(function(serverElem) {
                      var newArray = copyRestangularizedElement(__this);
                      newArray[idx] = serverElem;
                      deferred.resolve(newArray);
                  }, function(response) {
                      deferred.reject(response);
                  });
                  
                  return restangularizePromise(deferred.promise, true)
              }
              
              
              function fetchFunction(what, reqParams, headers) {
                  var __this = this;
                  var deferred = $q.defer();
                  var operation = 'getList';
                  var url = urlHandler.fetchUrl(this, what);
                  var whatFetched = what || __this[config.restangularFields.route];
                  

                  var request = config.fullRequestInterceptor(null, operation, 
                      whatFetched, url, headers || {}, reqParams || {});

                  urlHandler.resource(this, $http, request.headers, request.params, what).getList().then(function(response) {
                      var resData = response.data;
                      var data = config.responseExtractor(resData, operation, whatFetched, url);
                      var processedData = _.map(data, function(elem) {
                          if (!__this[config.restangularFields.restangularCollection]) {
                              return restangularizeElem(__this, elem, what);
                          } else {
                              return restangularizeElem(__this[config.restangularFields.parentResource],
                                elem, __this[config.restangularFields.route]);
                          }
                          
                      });

                      processedData = _.extend(data, processedData);
                      if (!__this[config.restangularFields.restangularCollection]) {
                          resolvePromise(deferred, response, restangularizeCollection(__this, processedData, what));
                      } else {
                          resolvePromise(deferred, response, restangularizeCollection(null, processedData, __this[config.restangularFields.route]));
                      }
                  }, function error(response) {
                      config.errorInterceptor(response);
                      deferred.reject(response);
                  });
                  
                  return restangularizePromise(deferred.promise, true);
              }
              
              function elemFunction(operation, what, params, obj, headers) {
                  var __this = this;
                  var deferred = $q.defer();
                  var resParams = params || {};
                  var resObj = obj || this;
                  var route = what || this[config.restangularFields.route];
                  var fetchUrl = urlHandler.fetchUrl(this, what);
                  
                  var callObj = obj || stripRestangular(this);
                  request = config.fullRequestInterceptor(callObj, operation, route, fetchUrl, 
                    headers || {}, resParams || {});
                  
                  var okCallback = function(response) {
                      var resData = response.data;
                      var elem = config.responseExtractor(resData, operation, route, fetchUrl) || resObj;
                      if (operation === "post" && !__this[config.restangularFields.restangularCollection]) {
                        resolvePromise(deferred, response, restangularizeElem(__this, elem, what));
                      } else {
                        resolvePromise(deferred, response, restangularizeElem(__this[config.restangularFields.parentResource], elem, __this[config.restangularFields.route]));
                      }

                  };
                  
                  var errorCallback = function(response) {
                      config.errorInterceptor(response);
                      deferred.reject(response);
                  };
                  // Overring HTTP Method
                  var callOperation = operation;
                  var callHeaders = _.extend({}, request.headers);
                  var isOverrideOperation = config.isOverridenMethod(operation);
                  if (isOverrideOperation) {
                    callOperation = 'post';
                    callHeaders = _.extend(callHeaders, {'X-HTTP-Method-Override': operation});
                  }
                  
                  if (config.isSafe(operation)) {
                    if (isOverrideOperation) {
                      urlHandler.resource(this, $http, callHeaders, request.params, 
                        what)[callOperation]({}).then(okCallback, errorCallback);
                    } else {
                      urlHandler.resource(this, $http, callHeaders, request.params, 
                        what)[callOperation]().then(okCallback, errorCallback);
                    }
                  } else {
                      urlHandler.resource(this, $http, callHeaders, request.params, 
                        what)[callOperation](request.element).then(okCallback, errorCallback);
                  }
                  
                  return restangularizePromise(deferred.promise);
              }
              
              function getFunction(params, headers) {
                  return _.bind(elemFunction, this)("get", undefined, params, undefined, headers);
              }
              
              function deleteFunction(params, headers) {
                  return _.bind(elemFunction, this)("remove", undefined, params, undefined, headers);
              }
              
              function putFunction(params, headers) {
                  return _.bind(elemFunction, this)("put", undefined, params, undefined, headers);
              }

              function postFunction(what, elem, params, headers) {
                  return _.bind(elemFunction, this)("post", what, params, elem, headers);
              }

             function headFunction(params, headers) {
               return _.bind(elemFunction, this)("head", undefined, params, undefined, headers);
             }

             function traceFunction(params, headers) {
               return _.bind(elemFunction, this)("trace", undefined, params, undefined, headers);
             }

             function optionsFunction(params, headers) {
               return _.bind(elemFunction, this)("options", undefined, params, undefined, headers);
             }

             function patchFunction(params, headers) {
               return _.bind(elemFunction, this)("patch", undefined, params, undefined, headers);
             }
             
             function customFunction(operation, path, params, headers, elem) {
                 return _.bind(elemFunction, this)(operation, path, params, elem, headers);
             }
             
             function addRestangularMethodFunction(name, operation, path, defaultParams, defaultHeaders, defaultElem) {
                 var bindedFunction;
                 if (operation === 'getList') {
                     bindedFunction = _.bind(fetchFunction, this, path); 
                 } else {
                     bindedFunction = _.bind(customFunction, this, operation, path);
                 }
                 
                 this[name] = function(params, headers, elem) {
                     var callParams = _.defaults({
                         params: params,
                         headers: headers,
                         elem: elem
                     }, {
                         params: defaultParams,
                         headers: defaultHeaders,
                         elem: defaultElem
                     });
                     return bindedFunction(callParams.params, callParams.headers, callParams.elem);
                 }
             }

             function withConfigurationFunction(configurer) {
                 var newConfig = angular.copy(globalConfiguration);
                 Configurer.init(newConfig, newConfig);
                 configurer(newConfig);
                 return createServiceForConfiguration(newConfig);
             }
             
              
              Configurer.init(service, globalConfiguration);
              
              service.copy = _.bind(copyRestangularizedElement, service);

              service.withConfig = _.bind(withConfigurationFunction, service);
              
              service.one = _.bind(one, service, null);
              
              service.all = _.bind(all, service, null);

              service.restangularizeElement = _.bind(restangularizeElem, service);

              service.restangularizeCollection = _.bind(restangularizeCollection, service);
              
              return service;
          }

          return createServiceForConfiguration(globalConfiguration);
          
       
        }];
    }
);

})();
