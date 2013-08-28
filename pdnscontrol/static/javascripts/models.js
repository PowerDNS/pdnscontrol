ServerData.Config.api_base = ServerData.Config.url_root + 'api';

angular.module('models', ['restangular']).
  config(function(RestangularProvider) {
    RestangularProvider.setBaseUrl(ServerData.Config.api_base);
    RestangularProvider.setRestangularFields({
      id: "_id"
    });
    RestangularProvider.setRequestInterceptor(function(original_elem, operation, what) {
      var tmp, singular;
      var elem = original_elem;
      console.log(what, operation, elem);
      singular = what.replace(/s$/, '');
      if (operation === 'put' || operation === 'post') {
        elem._id = undefined;
        tmp = elem;
        elem = {};
        elem[singular] = tmp;
      }
      console.log('sending', elem);
      return elem;
    });
    RestangularProvider.setResponseExtractor(function(original_response, operation, what, url) {
      var response = original_response;
      var singular = what.replace(/s$/, '');
      if (operation === 'getList') {
        return response[what];
      }
      if ((operation === 'get' || operation == 'put' || operation == 'post') && response[singular]) {
        response = response[singular];
        response._url = url;
        if (!!response.name && !response._id) {
          response._id = response.name;
        }
      }
      console.log('setResponse', response);
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
      server.addRestangularMethod('flush_cache', 'post', 'flush-cache', null, {});
      server.addRestangularMethod('log_grep', 'get', 'log-grep', null, {needle: true});
      server.addRestangularMethod('control', 'post', 'control', null, {parameters: true});
      server.graphite_name = (function() {
        var name = 'pdns.' + server.name.replace(/\./gm,'-');
        if (server.daemon_type == 'Authoritative') {
          name = name + '.auth';
        } else {
          name = name + '.recursor';
        }
        return name;
      })();

      if (server.stats) {
        server.uptime = server.stats.uptime;
        if (server.daemon_type == 'Authoritative') {
          server.version = server.stats.version;
        }
      }
      if (server.config) {
        if (server.daemon_type == 'Authoritative') {
          // Auth replies with a list instead of an object.
          server.config = _.object(server.config);
        }
        if (server.daemon_type == 'Recursor') {
          server.version = server.config['version-string'].split(" ")[2];
        }
        server.listen_address = (function() {
          var local_address = server.config['local-address'];
          var local_ipv6 = server.config['local-ipv6'];
          return '' +
            (local_address || '') +
            ' ' +
            (local_ipv6 || '');
        })();
        server.config.mustDo = function(key) {
          var val = server.config[key];
          return (val!=="no") && (val!=="off");
        };
      }

      return server;
    });
  });
