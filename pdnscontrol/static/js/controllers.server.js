"use strict";

angular.module('ControlApp.controllers.server', []);

angular.module('ControlApp.controllers.server').controller('ServerListCtrl', ['$scope', '$compile', '$filter', 'Restangular', function($scope, $compile, $filter, Restangular) {
  // init server-list filter
  $scope.filter = "";

  Restangular.all("servers").getList().then(function(servers) {
    $scope.servers = servers;
    _.each($scope.servers, function(server) {
      server.selected = true;
    });
  });

  $scope.orderProp = 'name';

  var ngFilter = $filter('filter');
  $scope.selected_servers = function() {
    return ngFilter(_.filter($scope.servers, function(server) {
      return server.selected;
    }), $scope.filter);
  };
  $scope.recursors = function() {
    // TODO: apply 'filter' filter (name match)
    return _.filter($scope.selected_servers(), function(server) {
      return server.daemon_type === 'Recursor';
    });
  };
  $scope.authoritatives = function() {
    return _.filter($scope.selected_servers(), function(server) {
      return server.daemon_type === 'Authoritative';
    });
  };

  $scope.auth_answers = function() {
    var sources, servers;
    sources = 'nonNegativeDerivative(%SOURCE%.udp-answers)';

    servers = $scope.authoritatives();
    servers = _.map(servers, function(server) {
      var source = server.graphite_name;
      return 'sumSeries(' + sources.replace(/%SOURCE%/g, source) + ')';
    });
    if (servers.length === 0) {
      return '';
    }

    return "sumSeries(" + servers.join(',') + ")";
  };

  $scope.auth_queries = function() {
    var sources, servers;
    sources = 'nonNegativeDerivative(%SOURCE%.udp-queries)';

    servers = $scope.authoritatives();
    servers = _.map(servers, function(server) {
      var source = server.graphite_name;
      return 'sumSeries(' + sources.replace(/%SOURCE%/g, source) + ')';
    });
    if (servers.length === 0) {
      return '';
    }

    return "sumSeries(" + servers.join(',') + ")";
  };

  $scope.recursor_answers = function() {
    var sources, servers;
    sources = _.map(['answers0-1', 'answers1-10', 'answers10-100', 'answers100-1000', 'answers-slow', 'packetcache-hits'], function(val) {
      return 'nonNegativeDerivative(%SOURCE%.' + val + ')';
    }).join(',');

    servers = $scope.recursors();
    servers = _.map(servers, function(server) {
      var source = server.graphite_name;
      return 'sumSeries(' + sources.replace(/%SOURCE%/g, source) + ')';
    });
    if (servers.length === 0) {
      return '';
    }

    return "sumSeries(" + servers.join(',') + ")";
  };

  $scope.recursor_queries = function() {
    var sources, servers;

    servers = $scope.recursors();
    sources = _.map(['answers0-1', 'answers1-10', 'answers10-100', 'answers100-1000', 'answers-slow', 'packetcache-hits'], function(val) {
      return 'nonNegativeDerivative(%SOURCE%.' + val + ')';
    }).join(',');

    servers = _.map(servers, function(server) {
      var source = server.graphite_name;
      return 'sumSeries(' + sources.replace(/%SOURCE%/g, source) + ')';
    });
    if (servers.length === 0) {
      return '';
    }

    return "sumSeries(" + servers.join(',') + ")";
  };

  $scope.toggleSelectedAll = function() {
    _.each($scope.servers, function(server) {
      server.selected = $scope.selected_all;
    });
  };

  $scope.refreshSelectedAll = function() {
    $scope.selected_all = _.every($scope.servers, function(server) {
      return server.selected;
    });
  };

  $scope.popup_flush_cache = function() {
    showPopup($scope, $compile, 'server/flush_cache_multi', function(scope) {
      scope.loading = false;
      scope.affected_servers = $scope.selected_servers();
      scope.doIt = function() {
        var requestCount = scope.affected_servers.length;
        scope.results = [];
        scope.loading = true;
        _.each(scope.affected_servers, function(server) {
          server.flush_cache({'domain': scope.flush_domain}).then(function(response) {
            scope.results.push({server: server, output: '' + response.content.number + ' domains flushed.'});
            requestCount -= 1;
            if (requestCount === 0) {
              scope.loading = false;
            }
          }, function(response) {
            scope.results.push({server: server, output: 'Failed.'});
            scope.loading = false;
            requestCount -= 1;
            if (requestCount === 0) {
              scope.loading = false;
            }
          });
        });
      };
      // HACK: don't rely on setTimeout(, >0) here when we could use (, 0) or a callback from showPopup
      setTimeout(function() {
        angular.element("#flush_domain").focus();
      }, 100);
    });
  };

  $scope.popup_shutdown = function() {
    showPopup($scope, $compile, 'server/shutdown_multi', function(scope) {
      scope.loading = false;
      scope.affected_servers = $scope.selected_servers();
      scope.doIt = function() {
        var requestCount = scope.affected_servers.length;
        function reqDone() {
          requestCount -= 1;
          if (requestCount === 0) {
            scope.loading = false;
          }
        }
        scope.results = [];
        scope.loading = true;
        _.each(scope.affected_servers, function(server) {
          server.stop({}).then(function(response) {
            try {
              var output = '$ ' + response.cmdline.join(' ') + "\n" + response.output;
              scope.results.push({server: server, output: output});
            } catch (e) {
              scope.results.push({server: server, output: 'Response not understood.'});
            } finally {
              reqDone();
            }
          }, function(response) {
            scope.results.push({server: server, output: 'Request Failed.'});
            reqDone();
          });
        });
      };
    });
  };

  $scope.popup_restart = function() {
    showPopup($scope, $compile, 'server/restart_multi', function(scope) {
      scope.loading = false;
      scope.affected_servers = $scope.selected_servers();
      scope.doIt = function() {
        var requestCount = scope.affected_servers.length;
        function reqDone() {
          requestCount -= 1;
          if (requestCount === 0) {
            scope.loading = false;
          }
        }
        scope.results = [];
        scope.loading = true;
        _.each(scope.affected_servers, function(server) {
          server.restart({}).then(function(response) {
            try {
              var output = '$ ' + response.cmdline.join(' ') + "\n" + response.output;
              scope.results.push({server: server, output: output});
            } catch (e) {
              scope.results.push({server: server, output: 'Response not understood.'});
            } finally {
              reqDone();
            }
          }, function(response) {
            scope.results.push({server: server, output: 'Request Failed.'});
            reqDone();
          });
        });
      };
    });
  };
}]);

angular.module('ControlApp.controllers.server').controller('ServerCreateCtrl', ['$scope', '$location', 'Restangular', function($scope, $location, Restangular) {
  // set defaults
  $scope.server = {'daemon_type': 'Authoritative'};

  $scope.save = function() {
    Restangular.all("servers").post($scope.server).then(function(response) {
      $location.path('/server/' + $scope.server.name);
    }, function(response) {
      if (response.status === 422) {
        _.each(response.data.errors, function(field, desc) {
          $scope.serverForm.$setValidity("serverForm." + field + ".$invalid", false);
        });
      } else {
        alert('Server reported unexpected error ' + response.status);
      }
    });
  };

  $scope.cancel = function() {
    $location.path('/');
  };

  $scope.isClean = function() {
    return false;
  };
}]);

angular.module('ControlApp.controllers.server').controller('ServerDetailCtrl', ['$scope', '$compile', '$location', 'Restangular', 'server', function($scope, $compile, $location, Restangular, server) {
  $scope.server = server;
  (function() {
    var fragments = $location.path().split('/').reverse();
    if (fragments.length == 4) {
      $scope.current_tab = fragments[0];
    } else {
      $scope.current_tab = ''; // overview tab
    }
  })();

  $scope.isAddZoneAllowed = true;
  $scope.isSearchAllowed = (!!server.search_data);
  $scope.$watch('server.config', function() {
    $scope.isAddZoneAllowed = !$scope.server.mustDo("experimental-api-readonly", "no");
  });

  function loadServerData() {
    $scope.server.all("zones").getList().then(function(zones) {
      $scope.zones = zones;
    }, function() {
      $scope.load_error = 'Loading server information failed. The server may be down.';
    });
  }
  loadServerData();

  $scope.refreshStatistics = function() {
    server.get().then(function(s) {
      $scope.server = s;
    });
  };

  $scope.canEditConfig = function(varname) {
    return varname === 'allow-from' && !$scope.server.mustDo("experimental-api-readonly", "no");
  };

  $scope.$watch('server.config', function() {
    // _.pairs is not good enough for angular
    $scope.configuration = simpleListToKVList($scope.server.config);
  });
  $scope.$watch('server.stats', function() {
    // _.pairs is not good enough for angular
    $scope.statistics = simpleListToKVList($scope.server.stats);
  });

  $scope.popup_flush_cache = function() {
    showPopup($scope, $compile, 'server/flush_cache', function(scope) {
      scope.loading = false;
      scope.output = '';
      scope.doIt = function() {
        scope.loading = true;
        $scope.server.flush_cache({domain: scope.flush_domain}).then(function(response) {
          scope.output = '' + response.content.number + ' domains flushed.';
          scope.loading = false;
        }, function(response) {
          scope.output = 'Flushing failed.';
          scope.loading = false;
        });
      };
      // HACK: don't rely on setTimeout(, >0) here when we could use (, 0) or a callback from showPopup
      setTimeout(function() {
        angular.element("#flush_domain").focus();
      }, 100);
    });
  };

  function handleManagerResponseAndReload(scope, response) {
    scope.output = '$ ' + response.cmdline.join(' ') + "\n" + response.output;
    scope.succeeded = response.success;
    scope.loading = false;
    // reload server object, as everything might have changed now.
    $scope.server.get().then(function(s) {
      $scope.server = s;
      loadServerData();
    });
  }

  $scope.popup_shutdown = function() {
    showPopup($scope, $compile, 'server/shutdown', function(scope) {
      scope.loading = false;
      scope.output = '';
      scope.succeeded = false;
      scope.doIt = function() {
        scope.loading = true;
        $scope.server.stop({}).then(function(response) {
          handleManagerResponseAndReload(scope, response);
        }, function(response) {
          scope.output = 'Shutdown failed.';
          scope.loading = false;
        });
      };
    });
  };

  $scope.popup_restart = function() {
    showPopup($scope, $compile, 'server/restart', function(scope) {
      scope.loading = false;
      scope.output = '';
      scope.succeeded = false;
      scope.doIt = function() {
        scope.loading = true;
        $scope.server.restart({}).then(function(response) {
          handleManagerResponseAndReload(scope, response);
        }, function(response) {
          scope.output = 'Restart failed.';
          scope.loading = false;
        });
      };
    });
  };

  $scope.search_data = function(q) {
    gotoServerSearchData($location, server, q);
  };

  // for zone list
  $scope.showMore = function() {
    $scope.rowLimit += 100;
    $scope.$digest(); // force update of DOM (for nginfinitescroll)
  };
}]);

angular.module('ControlApp.controllers.server').controller('ServerEditCtrl', ['$scope', '$location', 'Restangular', 'server', function($scope, $location, Restangular, server) {
  $scope.master = server;
  $scope.server = Restangular.copy($scope.master);

  $scope.isClean = function() {
    return angular.equals($scope.master, $scope.server);
  };

  $scope.destroy = function() {
    if (confirm('Do you really want to remove the server named "' + $scope.master.name + '" from pdnscontrol?')) {
      $scope.master.remove().then(function() {
        $location.path('/');
      });
    }
  };

  $scope.save = function() {
    $scope.server.put().then(function() {
      $location.path('/server/' + $scope.server.name);
    });
  };

  $scope.cancel = function() {
    $location.path('/server/' + $scope.server.name);
  };
}]);

angular.module('ControlApp.controllers.server').controller('ConfigEditCtrl',
  ['$scope', '$location', 'Restangular', 'server', 'config',
    function($scope, $location, Restangular, server, config) {
      $scope.server = server;
      $scope.master = config;
      $scope.master.value_o = _.map($scope.master.value, function(o) { return {'value': o}; });
      $scope.config = Restangular.copy($scope.master);
      $scope.placeholder = "192.0.2.1/24";

      $scope.addOne = function() {
        $scope.config.value_o.push({'value': ''});
      };

      $scope.removeOne = function(index) {
        $scope.config.value_o.splice(index, 1);
      };

      $scope.save = function() {
        $scope.config.value = _.compact(_.pluck($scope.config.value_o, 'value'));
        $scope.config.put().then(function() {
          $location.path('/server/' + $scope.server.name);
        }, function(errorResponse) {
          var msg = errorResponse.data.error || 'Save failed.';
          alert(msg);
        });
      };

      $scope.cancel = function() {
        $location.path('/server/' + $scope.server.name + '/config');
      };

      $scope.addOne();
    }
  ]
);

angular.module('ControlApp.controllers.server').controller('ServerSearchDataCtrl', ['$scope', '$location', 'Restangular', 'server', function($scope, $location, Restangular, server) {
  $scope.server = server;
  $scope.search = $location.search().q;
  $scope.data_query = $scope.search; // for new searches
  $scope.errors = [];
  $scope.results = server.search_data({q: $scope.search}).then(function(response) {
    $scope.results = response;
  }, function(errorResponse) {
    $scope.errors.push(errorResponse.data.error || 'Unknown server error');
  });

  $scope.search_data = function(q) {
    gotoServerSearchData($location, server, q);
  };
}]);

angular.module('ControlApp.controllers.server').controller('GlobalSearchDataCtrl', ['$scope', '$location', 'Restangular', function($scope, $location, Restangular) {
  $scope.search = $location.search().q;
  $scope.data_query = $scope.search; // for new searches
  $scope.errors = [];
  $scope.results = [];

  Restangular.all("servers").getList().then(function(servers) {
    $scope.servers = servers;
    $scope.results = [];
    _.each($scope.servers, function(server) {
      var serverObj = {
        'name': server.name,
        'url': '/server/' + server.name
      };
      if (!server.search_data) {
        return;
      }
      server.search_data({q: $scope.search}).then(function(response) {
        var idx = response.length;
        while(idx-- > 0) {
          var result = response[idx];
          result.server = serverObj;
          $scope.results.push(response[idx]);
        }
      }, function(errorResponse) {
        $scope.errors.push(errorResponse.data.error || 'Unknown server error');
      });
    });
  });

  $scope.search_data = function(q) {
    $location.search({q: q});
  };
}]);
