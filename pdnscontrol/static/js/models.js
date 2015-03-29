"use strict";

angular.module('models', ['restangular']).
  config(function(RestangularProvider) {
    RestangularProvider.setBaseUrl(ServerData.Config.url_root + 'api');
    RestangularProvider.setRestangularFields({
      id: "_id"
    });
    RestangularProvider.setRequestInterceptor(function(elem, operation, what) {
      if (operation === 'put' || operation === 'post' || operation === 'patch') {
        elem._id = undefined;
      }
      //DBG//console.log('sending', elem);
      return elem;
    });
    RestangularProvider.setResponseExtractor(function(response, operation, what, url) {
      if (operation === 'export') {
        // doesn't return JSON, but a string instead.
        return response;
      }
      if (operation === 'getList') {
        var i;
        for (i = 0; i < response.length; i++) {
          if (!response[i]._id && response[i].id) {
            response[i]._id = response[i].id;
          }
        }
        return response;
      }
      if (operation === 'get' || operation === 'put' || operation === 'post') {
        if (!response._id && !!response.id) {
          response._id = response.id;
        }
        if (!response._id && !!response.name) {
          response._id = response.name;
        }
        //DBG//if (!response._id) {
          //DBG//console.log('request for', operation, what, 'yielded no _id');
        //DBG//}
        response._url = url;
      }
      //DBG//console.log('setResponse', response);
      return response;
    });

    RestangularProvider.addElementTransformer("servers", false, function(server) {
      if (!server.name) {
        // not yet complete
        return server;
      }
      // addRM signature is (name, operation, path, params, headers, elementToPost)
      server.addRestangularMethod('stop', 'post', 'stop', null, {});
      server.addRestangularMethod('restart', 'post', 'restart', null, {});
      server.addRestangularMethod('update', 'post', 'update', null, {});
      server.addRestangularMethod('flush_cache', 'put', 'flush-cache', null, {});
      server.addRestangularMethod('search_log', 'get', 'search-log', null, {needle: true});
      server.addRestangularMethod('control', 'post', 'control', null, {parameters: true});
      server.graphite_name = (function() {
        var name = 'pdns.' + server.name.replace(/\./gm,'-');
        if (server.daemon_type === 'Authoritative') {
          name = name + '.auth';
        } else {
          name = name + '.recursor';
        }
        return name;
      })();
      server.addRestangularMethod('search_data', 'get', 'search-data', null, {q: true});

      server.stats = {};
      server.config = {};

      server.one('statistics').get().then(function(resp) {
        server.stats = _.object(_.map(resp, function(o) { return [o.name, o.value]; }));
      });
      server.one('config').get().then(function(resp) {
        server.config = _.object(_.map(resp, function(o) { return [o.name, o.value]; }));
      });
      if (!('version' in server)) {
        server.get().then(function(resp) {
          server.version = resp.version;
        });
      }

      server.mustDo = function(key, dflt) {
        var val = server.config[key];
        if (val === undefined)
          val = dflt;
        return (val!=="no") && (val!=="off");
      };

      server.listen_address = (function() {
        var local_address = server.config['local-address'];
        var local_ipv6 = server.config['local-ipv6'];
        return '' +
          (local_address || '') +
          ' ' +
          (local_ipv6 || '');
      });

      return server;
    });
  });
