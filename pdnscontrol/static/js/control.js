// Controlling Application
"use strict";

var ControlApp = angular.module('control', [
  'ngRoute',
  'models',
  'components',
  'graphite',
  'services.breadcrumbs',
  'services.httpRequestTracker',
  'xeditable'
]);

ControlApp.provider(
  "$exceptionHandler",{
    $get: function(exceptionHandlingService){
      return(exceptionHandlingService);
    }
  }
);

ControlApp.factory(
  "exceptionHandlingService",
  ["$log",
   function($log){
     function error(exception, cause){
       // preserve the default behaviour which will log the error
       // to the console, and allow the application to continue running.
       $log.error.apply($log, arguments);

       alert('Something went wrong.\n' + exception.toString());
     }
     return(error);
   }]
);

ControlApp.run(function(editableOptions) {
  editableOptions.theme = 'default';
});


////////////////////////////////////////////////////////////////////////
// Shared object resolver functions
////////////////////////////////////////////////////////////////////////

function ServerResolver(Restangular, $route) {
  return Restangular.one('servers', $route.current.params.serverName).get();
}

function ZoneResolver(Restangular, $route) {
  return Restangular.one('servers', $route.current.params.serverName).one('zones', $route.current.params.zoneId).get();
}

function NewZoneResolver(Restangular, $route) {
  return Restangular.one('servers', $route.current.params.serverName).one('zones');
}

function ConfigResolver(Restangular, $route) {
  return Restangular.one('servers', $route.current.params.serverName).one('config', $route.current.params.configName).get();
}

function MeResolver(Restangular) {
  return Restangular.one('me').get();
}

function UserResolver(Restangular, $route) {
  return Restangular.one('users', $route.current.params.userId).get();
}

////////////////////////////////////////////////////////////////////////
// Routing
////////////////////////////////////////////////////////////////////////

ControlApp.
  config(function($routeProvider, $locationProvider) {
    moment.lang('en');
    $locationProvider.html5Mode(true);
    $routeProvider.
      when('/', {controller: 'ServerListCtrl', templateUrl: templateUrl('server/list')}).
      when('/server/:serverName', {
        controller: 'ServerDetailCtrl', templateUrl: templateUrl('server/detail'),
        resolve: {
          server: ServerResolver
        }
      }).
      when('/server/:serverName/edit', {
        controller: 'ServerEditCtrl', templateUrl: templateUrl('server/edit'),
        resolve: {
          server: ServerResolver
        }
      }).
      when('/server/:serverName/config/:configName/edit', {
        controller: 'ConfigEditCtrl', templateUrl: templateUrl('config/edit'),
        resolve: {
          server: ServerResolver,
          config: ConfigResolver
        }
      }).
      when('/server/:serverName/search-data', {
        controller: 'ServerSearchDataCtrl', templateUrl: templateUrl('server/search_data'),
        resolve: {
          server: ServerResolver
        }
      }).
      when('/server/:serverName/zone/:zoneId', {
        controller: 'ZoneDetailCtrl', templateUrl: templateUrl('zone/detail'),
        resolve: {
          server: ServerResolver,
          zone: ZoneResolver
        }
      }).
      when('/server/:serverName/zone/:zoneId/edit', {
        controller: 'ZoneEditCtrl', templateUrl: templateUrl('zone/edit'),
        resolve: {
          server: ServerResolver,
          zone: ZoneResolver
        }
      }).
      when('/server/:serverName/zones/new', {
        controller: 'ZoneEditCtrl', templateUrl: templateUrl('zone/edit'),
        resolve: {
          server: ServerResolver,
          zone: NewZoneResolver
        }
      }).
      when('/servers/new', {
        controller: 'ServerCreateCtrl', templateUrl: templateUrl('server/edit')
      }).
      when('/search-data', {
        controller: 'GlobalSearchDataCtrl', templateUrl: templateUrl('search_data')
      }).
      when('/me', {
        controller: 'MeDetailCtrl', templateUrl: templateUrl('me/detail'),
        resolve: {
          me: MeResolver
        }
      });

    if (ServerData.User.roles.indexOf('view-users') !== -1) {
      $routeProvider.
        when('/users', {
          controller: 'UserListCtrl', templateUrl: templateUrl('user/list')
        });
    }
    if (ServerData.User.roles.indexOf('edit-users') !== -1) {
      $routeProvider.
        when('/user/:userId/edit', {
          controller: 'UserEditCtrl', templateUrl: templateUrl('user/edit'),
          resolve: {
            user: UserResolver
          }
        }).
        when('/users/new', {
          controller: 'UserCreateCtrl', templateUrl: templateUrl('user/edit')
        });
    }

    $routeProvider.
      otherwise({redirectTo: '/'});
  });

////////////////////////////////////////////////////////////////////////
// Filters
////////////////////////////////////////////////////////////////////////

ControlApp.
  filter('absolutize_time', function() {
    return function(value) {
      if (!value) {
        return '';
      }
      return moment().subtract('seconds', value);
    };
  }).
  filter('rel_timestamp', function() {
    return function(value) {
      if (!value) {
        return 'unknown';
      }
      return moment(value).fromNow();
    };
  }).
  filter('full_and_rel_timestamp', function() {
    return function(value) {
      if (!value) {
        return '';
      }
      var m = moment(value);
      return m.format('LLLL') + " (" + m.fromNow() + ")";
    };
  }).
  filter('full_timestamp', function() {
    return function(value) {
      if (!value) {
        return '';
      }
      return moment(value).format('LLLL');
    };
  }).
  filter('short_timestamp', function() {
    return function(value) {
      if (!value) {
        return '';
      }
      return moment(value).format('L HH:mm:ss');
    };
  }).
  filter('unixts_time', function() {
    return moment.unix;
  }).
  filter('array_join', function() {
    return function(value) {
      if (value === undefined) {
        return '';
      }
      return value.join(' ');
    };
  });


ControlApp.directive('searchlog', function() {
  return {
    restrict: 'E',
    templateUrl: templateUrl('server/search_log_directive'),
    replace: true,
    scope: {
      servers: '&servers'
    },
    controller: ['$scope', '$compile', function($scope, $compile) {
      $scope.query = '';
      $scope.submit = function() {
        if ($scope.query.length === 0) {
          return;
        }
        var servers = $scope.servers();
        if (angular.isFunction(servers)) {
          // happens when we use a scope function as arg to servers=.
          servers = servers();
        }
        showPopup($scope, $compile, 'server/search_log', function(popupScope) {
          popupScope.logData = [];
          popupScope.errors = [];

          _.each(servers, function(server) {
            server.search_log({q: $scope.query}).then(function(response) {
              popupScope.logData.push.apply(popupScope.logData, _.map(response, function(line) {
                var date_hostname = line.split(' ', 2);
                var message = line.substring(date_hostname[0].length + date_hostname[1].length + 2);
                return {
                  date: date_hostname[0],
                  hostname: date_hostname[1],
                  message: message
                };
              }));
            }, function(response) {
              popupScope.errors.push({'server': server.name, 'cause': (response.data && response.data.error)});
            });
          });

        });
      };
    }]
  };
});

ControlApp.directive('spinner', function() {
  return {
    restrict: 'E',
    template: '<div class="inline-block"></div>',
    replace: true,
    scope: {
      spin: '@'
    },
    link: function(scope, elm, attrs) {
      scope.spinning = false;
      var spinner = new Spinner({
        lines: 11, // The number of lines to draw
        length: 5, // The length of each line
        width: 2, // The line thickness
        radius: 6, // The radius of the inner circle
        corners: 1, // Corner roundness (0..1)
        rotate: 0, // The rotation offset
        direction: 1, // 1: clockwise, -1: counterclockwise
        color: '#000', // #rgb or #rrggbb
        speed: 1.0, // Rounds per second
        trail: 56, // Afterglow percentage
        shadow: false, // Whether to render a shadow
        hwaccel: true, // Whether to use hardware acceleration
        className: 'spinner', // The CSS class to assign to the spinner
        zIndex: 2e9, // The z-index (defaults to 2000000000)
        top: '-18', // Top position relative to parent in px
        left: '-20' // Left position relative to parent in px
      });

      attrs.$observe('spin', function() {
        var spin = (scope.spin === 'true');
        if (scope.spinning !== spin) {
          if (spin === true) {
            spinner.spin(elm[0]);
          } else {
            spinner.stop();
          }
          scope.spinning = spin;
        }
      });
    }
  };
});


////////////////////////////////////////////////////////////////////////
// Base UI
////////////////////////////////////////////////////////////////////////

// decode zone id into zone name
function zoneIdToName(zoneId) {
  var tmp = "";
  var idx;
  for (idx = 0; idx<zoneId.length; idx++) {
    var chr = zoneId[idx];
    if (chr === '=') {
      chr = zoneId[idx+1] + zoneId[idx+2];
      chr = String.fromCharCode(parseInt(chr, 16));
      idx += 2;
    }
    tmp += chr;
  }
  if (tmp.length > 1 && tmp[tmp.length-1] === '.') {
    tmp = tmp.substr(0, tmp.length-1);
  }
  return tmp;
}

ControlApp.controller('NavCtrl', ['$scope', 'breadcrumbs', 'httpRequestTracker', function($scope, breadcrumbs, httpRequestTracker) {
  $scope.hasPendingRequests = function() {
    return httpRequestTracker.hasPendingRequests();
  };

  $scope.breadcrumbs = breadcrumbs;
  var filtered = [];
  var rawCache;
  $scope.breadcrumbs.filtered = function() {
    var raw = breadcrumbs.getAll();
    if (rawCache === raw) {
      return filtered;
    }

    filtered.length = 0;
    if (raw[0]) {
      if (raw[0].name === 'server' || raw[0].name === '') {
        filtered.push({name: 'Servers', path: '/servers'});
        if (raw[1]) {
          filtered.push(raw[1]);
          if (raw[2] && raw[3]) {
            var raw3 = raw[3];
            if (raw[2].name === 'zone') {
              raw3.name = zoneIdToName(raw3.name);
            }
            filtered.push(raw3);
          }
        }
      } else if (raw[0].name === 'user' || raw[0].name === 'users') {
        filtered.push({name: 'Users', path: '/users'});
      }
    }
    rawCache = raw;
    return filtered;
  };

  $scope.search_placeholder = function() {
    var crumbs = breadcrumbs.getAll();
    if (crumbs.length > 1 && crumbs[0].name === 'server') {
      return 'Search in ' + crumbs[1].name + '...';
    }
    return 'Search...';
  };

  $scope.search_context = function() {
    var crumbs = breadcrumbs.getAll();
    if (crumbs.length > 1 && crumbs[0].name === 'server') {
      return crumbs[1].name;
    }
    return ''; // global
  };
}]);

ControlApp.controller('MainCtrl', ['$scope', '$document', '$location', function($scope, $document, $location) {
  var searchBox = angular.element('#topbar-search');
  var FORWARD_SLASH_KEYCODE = 191;
  var ENTER_KEYCODE = 13;

  // search hotkey
  angular.element($document[0].body).bind('keydown', function(event) {
    if (event.keyCode === FORWARD_SLASH_KEYCODE && document.activeElement === $document[0].body) {
      event.stopPropagation();
      event.preventDefault();
      searchBox.focus();
      searchBox.select();
    }
  });

  searchBox.bind('keydown', function(event) {
    if (event.keyCode === ENTER_KEYCODE) {
      var val = searchBox.val();
      if (val === '') {
        return;
      }
      $scope.$emit('global-search', {q: val, context: searchBox.attr('search-context')});
      searchBox.blur();
    }
  });

  $scope.$on('global-search', function(event, args) {
    var url = '/search-data'; // global search
    if (args.context) {
      url = '/server/' + args.context + url;
    }
    $location.path(url).search({q: args.q});
    event.targetScope.$apply();
  });
}]);

////////////////////////////////////////////////////////////////////////
// Servers
////////////////////////////////////////////////////////////////////////

function gotoServerSearchData($location, server, q) {
  $location.path('/server/'+server.name+'/search-data').search({'q': q});
}

ControlApp.controller('ServerListCtrl', ['$scope', '$compile', '$filter', 'Restangular', function($scope, $compile, $filter, Restangular) {
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

ControlApp.controller('ServerCreateCtrl', ['$scope', '$location', 'Restangular', function($scope, $location, Restangular) {
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

ControlApp.controller('ServerDetailCtrl', ['$scope', '$compile', '$location', 'Restangular', 'server', function($scope, $compile, $location, Restangular, server) {
  $scope.server = server;

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
}]);

ControlApp.controller('ServerEditCtrl', ['$scope', '$location', 'Restangular', 'server', function($scope, $location, Restangular, server) {
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

ControlApp.controller('ServerSearchDataCtrl', ['$scope', '$location', 'server', function($scope, $location, server) {
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

ControlApp.controller('GlobalSearchDataCtrl', ['$scope', '$location', 'Restangular', function($scope, $location, Restangular) {
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

////////////////////////////////////////////////////////////////////////
// (Server) Config
////////////////////////////////////////////////////////////////////////
ControlApp.controller('GlobalSearchDataCtrl', ['$scope', '$location', 'Restangular', 'server', 'config', function($scope, $location, Restangular, server, config) {
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
    $location.path('/server/' + $scope.server.name);
  };

  $scope.addOne();
}]);

////////////////////////////////////////////////////////////////////////
// Zones
////////////////////////////////////////////////////////////////////////

function revNameIPv4(ip) {
  return ip.split('.').reverse().join('.') + ".in-addr.arpa";
}

function revNameIPv6(ip) {
  var rev, chunks;
  chunks = ip.split(':');
  rev = _.flatten(_.map(chunks, function(e) {
    if (e === "") {
      return new Array(10-chunks.length).join('0000');
    }
    return new Array(5-e.length).join("0") + e;
  })).join('').split('').reverse().join('.');
  return rev + '.ip6.arpa';
}

function diffAB(a, b, select_cb) {
  var unchanged = [], changed = [], removed = [];
  var bCopy = [].concat(b);
  var aIdx = a.length;
  while (aIdx--) {
    var found = false;
    var aEntry = a[aIdx];
    var bIdx = bCopy.length;
    while (bIdx--) {
      var bEntry = bCopy[bIdx];
      found = select_cb(aEntry, bEntry);
      if (found) {
        if (!angular.equals(aEntry, bEntry)) {
          changed.push([aEntry, bEntry]);
        } else {
          unchanged.push(aEntry);
        }
        bCopy.splice(bIdx, 1);
        break;
      }
    }
    if (!found) {
      removed.push(aEntry);
    }
  }
  return {unchanged: unchanged, changed: changed, removed: removed, added: bCopy};
}

/**
 * Returns differences in two rrset lists, suitable for PowerDNS
 * API server to understand them as change operations to be applied
 * to an existing zone.
 * Output format:
 {
  "name": <string>,
  "type": <string>,
  "changetype": <changetype>,
  "records": [
     {
       "content": <string>,
       "name": <string>,
       "priority": <int>,
       "ttl": <int>,
       "type": <string>,
       "disabled": <bool>
     }, ...
   ],
   "comments": [
     {
       "account": <string>,
       "content": <string>,
       "modfied_at": <int>
     }, ...
   ]
 }
 */
function diffRRsets(master, current) {
  function cmpNameType(a, b) {
    return a.name === b.name && a.type === b.type;
  }

  var changes = [];
  var diff = diffAB(master, current, cmpNameType);
  var data_attributes = ['records', 'comments'];
  /*
  console.log('---');
  console.log('removed: ', diff.removed);
  console.log('added: ', diff.added);
  console.log('changed: ', diff.changed);
  console.log('unchanged: ', diff.unchanged);
  */

  _.each(diff.removed, function(nt) {
    var overrides = _.reduce(data_attributes, function(memo, name) {
      memo[name] = []; // required to do an actual delete
      return memo;
    }, {});
    changes.push(_.extend({}, nt, overrides, {changetype: 'replace'}));
  });

  _.each(diff.added, function(nt) {
    changes.push(_.extend({}, nt, {changetype: 'replace'}));
  });

  _.each(diff.changed, function(ntList) {
    changes.push(_.extend({}, ntList[1], {changetype: 'replace'}));
  });

  return changes;
}

function forAllRRsetRecords(rrsets, cb) {
  var i = rrsets.length, j;
  while (i--) {
    var rrset = rrsets[i];
    j = rrset.records.length;
    while (j--) {
      rrset.records[j] = cb(rrset.records[j]);
    }
  }
  return rrsets;
}

/**
 * Sync names and types from rrsets down to records.
 */
function syncRRsetRecordNameTypes(rrsets) {
  var i = rrsets.length, j;
  while (i--) {
    var rrset = rrsets[i];
    j = rrset.records.length;
    while (j--) {
      rrset.records[j].name = rrset.name;
      rrset.records[j].type = rrset.type;
    }
    j = rrset.comments.length;
    while (j--) {
      rrset.comments[j].name = rrset.name;
      rrset.comments[j].type = rrset.type;
    }
  }
  return rrsets;
}

ControlApp.controller('ZoneDetailCtrl', ['$scope', '$compile', '$timeout', 'Restangular', 'server', 'zone', function($scope, $compile, $timeout, Restangular, server, zone) {
  $scope.server = server;
  $scope.loading = false;

  $scope.master = zone;
  $scope.master.rrsets = convertZoneToRRsetList(zone);
  $scope.zone = Restangular.copy($scope.master);

  $scope.isClean = function() {
    return angular.equals($scope.master, $scope.zone);
  };

  $scope.rrTypes = rrTypes;
  $scope.creatableRRTypes = _.filter(rrTypes, function(t) {
    if (t.allowCreate === undefined)
      return true;
    return t.allowCreate;
  });
  $scope.canModifyType = function(rrset) {
    return rrset.type === '' || (_.findWhere($scope.creatableRRTypes, {'name': rrset.type})) !== undefined;
  };

  $scope.showMore = function() {
    $scope.rowLimit += 100;
  };

  function matchAutoPtrsToZones(possiblePtrs) {
    // NOTE: $scope.zones MUST already be filled
    var ptr;
    var matchedPtrs = [];
    var zoneCache = {};
    var pendingRequests = 0;

    function autoPtrZoneLoadMaybeComplete() {
      if (pendingRequests > 0) {
        $timeout(autoPtrZoneLoadMaybeComplete, 50);
      } else {
        // have all data, see if we actually need to change any records
        var finalPtrSet = [];
        while (ptr = matchedPtrs.pop()) {
          ptr.replacedRecords = _.filter(zoneCache[ptr.zonename].records, function(rec) {
            return rec.name === ptr.revName && rec.type === 'PTR';
          });
          if (ptr.replacedRecords.length !== 1 || ptr.replacedRecords[0].content !== ptr.record.name) {
            finalPtrSet.push(ptr);
          }
        }
        autoPtrShowPopup(finalPtrSet);
      }
    }

    // See if we have a reverse zone for each possible PTR.
    // If not, we discard it.
    // Also start fetching the reverse zones already.
    _.each(possiblePtrs, function(ptr) {
      var matchingZones = _.sortBy(_.filter($scope.zones, function(z) { return ptr.revName.indexOf(z.name) != -1; }), function(z) { return z.name }).reverse();
      if (matchingZones.length === 0) {
        return;
      }
      ptr.zone = _.first(matchingZones);
      ptr.zonename = ptr.zone.name;
      if (!zoneCache[ptr.zonename]) {
        pendingRequests++;
        zoneCache[ptr.zonename] = ptr.zone;
        zoneCache[ptr.zonename].get().then(function(o) {
          zoneCache[ptr.zonename] = o;
          pendingRequests--;
        }, function(error) {
          pendingRequests--;
          alert(error);
        });
      }
      ptr.rrname = ptr.revName.replace('.'+ptr.zonename, '');
      matchedPtrs.push(ptr);
    });

    autoPtrZoneLoadMaybeComplete();
  }

  function autoPtrShowPopup(newPTRs) {
    if (newPTRs.length === 0) {
      // nothing to do
      return;
    }

    _.each(newPTRs, function(ptr) {
      ptr.done = false;
      ptr.failed = false;
      ptr.create = true;
    });

    showPopup($scope, $compile, 'zone/autoptr', function(scope) {
      scope.newPTRs = newPTRs;
      scope.inProgress = false;
      scope.errors = [];
      scope.canSave = function() {
        return !scope.inProgress && _.findWhere(scope.newPTRs, {create: true});
      };

      scope.doIt = function() {
        scope.inProgress = true;

        function maybeComplete() {
          var done = _.where(newPTRs, {done: true}).length;
          var failed = _.where(newPTRs, {done: true}).length;
          if (done == newPTRs.length) {
            // done
            scope.inProgress = false;
            scope.close();
            return;
          }
          if ((done + failed) == newPTRs.length) {
            scope.inProgress = false;
          }
        }

        _.each(newPTRs, function(ptr) {
          if (!ptr.create) {
            newPTRs.remove(ptr);
          }
        });

        _.each(newPTRs, function(ptr) {
          var change = {
            changetype: 'replace',
            name: ptr.revName,
            type: 'PTR',
            records: [{
              name: ptr.revName,
              content: ptr.record.name,
              type: 'PTR',
              ttl: ptr.record.ttl,
              priority: 0,
              disabled: false
            }]
          };

          ptr.zone.customOperation(
            'patch',
            'rrset',
            {},
            {'Content-Type': 'application/json'},
            change
          ).then(function(response) {
            ptr.done = true;
            if (response.error) {
              scope.errors.push(response.error);
            }
            maybeComplete();
          }, function(errorResponse) {
            ptr.failed = true;
            scope.errors.push(errorResponse.data.error || 'Unknown server error');
            maybeComplete();
          });
        });
      };
    });
  }

  function doAutoPtr(zoneChanges) {
    var possiblePtrs = [];
    var change;
    // build possible PTR records from changes
    while (change = zoneChanges.pop()) {
      if (change.changetype !== 'replace' || change.records.length === 0) {
        continue;
      }
      var rec;
      while (rec = change.records.pop()) {
        if (rec.disabled) {
          continue;
        }
        // build name of PTR record
        var revName;
        if (change.type === 'A') {
          revName = revNameIPv4(rec.content);
        } else if (change.type === 'AAAA') {
          revName = revNameIPv6(rec.content);
        } else {
          continue;
        }
        possiblePtrs.push({record: rec, revName: revName});
      }
    }

    if (!possiblePtrs) {
      // skip fetching zones, etc.
      return;
    }

    if (!$scope.zones) {
      $scope.zones = server.all('zones').getList().then(function(zones) {
        $scope.zones = zones;
        matchAutoPtrsToZones(possiblePtrs);
      }, function(response) {
        alert('Checking for possible Automatic PTRs failed: Loading zones failed.\n' + response.content);
      });
    } else {
      matchAutoPtrsToZones(possiblePtrs);
    }
  }

  $scope.save = function() {
    $scope.zone.rrsets = syncRRsetRecordNameTypes($scope.zone.rrsets);

    // now diff
    var changes = diffRRsets($scope.master.rrsets, $scope.zone.rrsets);
    var changesCopiedForAutoPtr = [].concat(changes);

    // remove _new from all records
    forAllRRsetRecords($scope.zone.rrsets, function(record) {
      record._new = undefined;
      return record;
    });

    function sendNextChange(changes) {
      var change = changes.pop();
      if (change === undefined) {
        // done. reset master so angular.equals will return true.
        $scope.master.rrsets = angular.copy($scope.zone.rrsets);
        $scope.zone = angular.copy($scope.master);
        doAutoPtr(changesCopiedForAutoPtr);
        return;
      }

      $scope.zone.customOperation(
        'patch',
        'rrset',
        {},
        {'Content-Type': 'application/json'},
        change
      ).then(function(response) {
        if (response.error) {
          $scope.errors.push(response.error);
          return;
        }
        sendNextChange(changes);
      }, function(errorResponse) {
        $scope.errors.push(errorResponse.data.error || 'Unknown server error');
      });
    }

    $scope.errors = [];
    sendNextChange(changes);
  };

  $scope.export = function() {
    $scope.zone.customOperation(
      'get',
      'export',
      {}
    ).then(function(response) {
      if (response.error) {
        alert(response.error);
        return;
      }
      saveAs(
        new Blob(
          [response.zone],
          {type: "text/plain;charset="+document.characterSet}
        ),
        $scope.zone.name+".zone"
      );
    }, function(errorResponse) {
      if (errorResponse.data && errorResponse.data.error) {
        alert(errorResponse.data.error);
      } else {
        alert('Unknown error from server, status '+errorResponse.status);
      }
    });
  };

  $scope.addRRSet = function() {
    // TODO: get default ttl from somewhere
    var rrset = {name: $scope.zone.name, type: '', records: [{priority: 0, ttl: 3600, content: '', disabled: false, _new: true}], comments: [], _new: true};
    $scope.zone.rrsets.push(rrset);
  };

  function setFlags() {
    $scope.isNotifyAllowed = ($scope.zone.kind.toUpperCase() === 'MASTER' && server.mustDo('master')) || ($scope.zone.kind.toUpperCase() === 'SLAVE' && server.mustDo('slave-renotify'));
    $scope.isUpdateFromMasterAllowed = ($scope.zone.kind.toUpperCase() === 'SLAVE');
    $scope.isEditZoneAllowed = ($scope.server.daemon_type === 'Recursor') || !server.mustDo("experimental-api-readonly", "no");
    $scope.isChangeAllowed = (($scope.server.daemon_type === 'Authoritative') && ($scope.zone.kind.toUpperCase() !== 'SLAVE') && $scope.isEditZoneAllowed);
    $scope.canExport = ($scope.server.daemon_type === 'Authoritative');
  }
  setFlags();
  $scope.$watch('server.config', setFlags);

  $scope.notify_slaves = function() {
    $scope.loading = true;
    $scope.server.control({command: 'NOTIFY '+$scope.zone.name}).then(function(response) {
      $scope.loading = false;
      alert(response.result);
    }, function() {
      $scope.loading = false;
      alert('Request failed.');
    });
  };

  $scope.update_from_master = function() {
    $scope.loading = true;
    $scope.server.control({command: 'RETRIEVE '+$scope.zone.name}).then(function(response) {
      $scope.loading = false;
      alert(response.result);
    }, function() {
      $scope.loading = false;
      alert('Request failed.');
    });
  };

  $scope.revert = function() {
    $scope.zone = Restangular.copy($scope.master);
  };

  $scope.stripZone = function(val) {
    if (val.substring(val.lastIndexOf('.'+$scope.zone.name)) === '.'+$scope.zone.name) {
      val = val.substring(0, val.lastIndexOf('.'+$scope.zone.name));
    } else if (val === $scope.zone.name) {
      val = '';
    }
    return val;
  };
  $scope.zoneDisplayName = function(val) {
    var ret;
    if (val.substring(val.lastIndexOf('.'+$scope.zone.name)) === '.'+$scope.zone.name) {
      ret = $scope.zone.name;
    } else if (val === $scope.zone.name) {
      ret = $scope.zone.name;
    } else {
      ret = ''; // zone name missing
    }
    if (ret === $scope.zone.name && ret.length > 10) {
      if ((val.length-ret.length) > 10) {
        // long label
        ret = '...';
      } else {
        // long zone name
        ret = '$ORIGIN';
      }
    }
    if (val !== $scope.zone.name) {
      ret = '.' + ret;
    }
    return ret;
  };

  var typesWithPriority = ['MX', 'SRV'];
  $scope.prioVisible = function(rrset, record) {
    return (typesWithPriority.indexOf(rrset.type) !== -1) || (record.priority > 0);
  };

  $scope.editComments = function(rrset) {
    showPopup($scope, $compile, 'zone/edit_comment', function(scope) {
      $scope.rrset = rrset;
    });
  };
  $scope.ifRRsetIsNew = function(rrset, ifNew, ifNotNew) {
    // Used to associate Name and Type edit fields with the record edit form, if the record has just been inserted.
    return (rrset._new && ifNew || ifNotNew);
  };
  $scope.canDelete = function(rrset) {
    return !(
      !$scope.isChangeAllowed ||
      (rrset.type === 'SOA' && $scope.zone.name === rrset.name)
      );
  };
  $scope.canEdit = function(rrset) {
    return $scope.isChangeAllowed;
  };
  $scope.canDuplicate = function(rrset) {
    return !(
      !$scope.isChangeAllowed ||
      rrset.type === 'CNAME' ||
      (rrset.type === 'SOA' && $scope.zone.name === rrset.name)
      );
  };
  $scope.deleteRecord = function(rrset, record) {
    if (!$scope.canDelete(rrset)) {
      // how did we come here? - trash icon should be disabled
      return;
    }
    rrset.records.splice(rrset.records.indexOf(record), 1);
  };
  $scope.duplicateRecord = function(rrset, current_record) {
    // insert copy of selected record immediately after it
    var newRecord = angular.copy(current_record);
    newRecord._new = true;
    rrset.records.splice(rrset.records.indexOf(current_record), 0, newRecord);
  };
  $scope.validateNameType = function(rrset, fieldname, data) {
    // check if name/type combination hasn't been used yet
    var finder = {name: rrset.name, type: rrset.type};
    finder[fieldname] = data; // overrides name or type from above
    if (_.findWhere($scope.zone.rrsets, finder) !== undefined) {
      alert('An RRset ' + finder.name + '/' + finder.type + ' already exists in this zone. Please choose another ' + fieldname + '.');
      return false;
    }
    return true;
  };

  $scope.commentsSupported = ($scope.zone.comments !== undefined);
}]);

ControlApp.controller('ZoneCommentCtrl', ['$scope', 'Restangular', function($scope, Restangular) {
  var qname = $scope.rrset.name;
  var qtype = $scope.rrset.type;

  $scope.master = $scope.rrset.comments;
  $scope.comments = Restangular.copy($scope.master);

  $scope.isClean = function() {
    return angular.equals($scope.master, $scope.comments);
  };
  $scope.addComment = function() {
    $scope.comments.push({'content': '', 'account': ServerData.User.email, '_new': true, 'name': qname, 'type': qtype});
  };
  $scope.removeComment = function(index) {
    $scope.comments.splice(index, 1);
  };
  $scope.close = function() {
    var i, c;
    for (i = 0; i < $scope.comments.length; i++) {
      c = $scope.comments[i];
      if (c.content && !c.modified_at) {
        c.modified_at = moment().unix();
      }
      if (!c.content && c._new) {
        $scope.comments.splice(i, 1);
        i--;
      }
    }
    $scope.rrset.comments = $scope.comments;
    $scope.$emit("finished");
  };

  // be nice and allow instant typing into a new comment
  if ($scope.isChangeAllowed) {
    $scope.addComment();
  }
}]);

ControlApp.controller('ZoneEditCtrl', ['$scope', '$location', 'Restangular', 'server', 'zone', function($scope, $location, Restangular, server, zone) {
  $scope.server = server;
  $scope.master = zone;
  $scope.errors = [];

  if (server.daemon_type === 'Recursor') {
    $scope.zone_types = ['Native', 'Forwarded'];
    $scope.arrays = ['server'];
    if (!$scope.master._url) {
      $scope.master.kind = 'Native';
      $scope.master.recursion_desired = false;
      // suggest filling out forward-to servers
      $scope.master.servers_o = $scope.master.servers_o || [{'server': ''}, {'server': ''}];
    } else {
      $scope.master.servers_o = _.map($scope.master.servers, function(o) { return {'server': o}; });
    }
  } else {
    $scope.zone_types = ['Native', 'Master', 'Slave'];
    $scope.arrays = ['master', 'nameserver'];
    if (!$scope.master._url) {
      $scope.master.kind = 'Native';
      // suggest filling out nameservers
      $scope.master.nameservers_o = [{'nameserver': ''}, {'nameserver': ''}];
      // suggest filling out masters
      $scope.master.masters_o     = [{'master': ''}, {'master': ''}];
    } else {
      $scope.master.nameservers_o = _.map($scope.master.nameservers, function(o) { return {'nameserver': o}; });
      $scope.master.masters_o     = _.map($scope.master.masters, function(o) { return {'master': o}; });
    }
  }
  $scope.zone = Restangular.copy($scope.master);

  $scope.isClean = function() {
    return angular.equals($scope.master, $scope.zone);
  };

  $scope.destroy = function() {
    if (confirm('Do you really want to delete the entire zone named "' + $scope.master.name + '"?')) {
      $scope.master.remove().then(function() {
        $location.path('/server/' + $scope.server.name);
      });
    }
  };

  $scope.addMaster = function() {
    $scope.zone.masters_o.push({'master': ''});
  };

  $scope.removeMaster = function(index) {
    $scope.zone.masters_o.splice(index, 1);
  };

  $scope.canAddMaster = function() {
    if (!$scope.showMasters())
      return false;
    return $scope.zone.masters_o.length < 9;
  };

  $scope.showMasters = function() {
    return $scope.zone.kind === 'Slave';
  };

  $scope.addNameserver = function() {
    $scope.zone.nameservers_o.push({'nameserver': ''});
  };

  $scope.removeNameserver = function(index) {
    $scope.zone.nameservers_o.splice(index, 1);
  };

  $scope.showNameservers = function() {
    return (!($scope.master._url)) && (server.daemon_type === 'Authoritative');
  };

  $scope.addServer = function() {
    $scope.zone.servers_o.push({'server': ''});
  };

  $scope.removeServer = function(index) {
    $scope.zone.servers_o.splice(index, 1);
  };

  $scope.canAddServer = function() {
    return $scope.zone.servers_o.length < 9;
  };

  $scope.showForwarders = function() {
    return $scope.zone.kind === 'Forwarded';
  };

  $scope.cancel = function() {
    var url = '/server/' + $scope.server.name;
    if (!!$scope.master._url) {
      url += '/zone/' + $scope.zone.id;
    }
    $location.path(url);
  };

  $scope.save = function() {
    var i;
    for (i = 0; i < $scope.arrays.length; i++) {
      var name = $scope.arrays[i];
      var plural = name+'s';
      $scope.zone[plural] = _.compact(_.map($scope.zone[plural+'_o'], function(o) { return o[name]; } ));
    }

    if (!!$scope.master._url) {
      // existing zone
      $scope.zone.put().then(function() {
        $location.path('/server/' + $scope.server.name + '/zone/' + $scope.zone.id);
      });
    } else {
      // new zone
      $scope.zone.post().then(function(resultObject) {
        $location.path('/server/' + $scope.server.name + '/zone/' + resultObject.id);
      }, function(response) {
        if (response.status === 422) {
          $scope.errors = [];
          _.each(response.data.errors, function(field, desc) {
            $scope.zoneForm.$setValidity("zoneForm." + field + ".$invalid", false);
          });
          if (response.data.error) {
            $scope.errors.push(response.data.error);
          }
        } else {
          alert('Server reported unexpected error ' + response.status);
        }
      });
    }
  };
}]);

////////////////////////////////////////////////////////////////////////
// Me -- currently logged in user
////////////////////////////////////////////////////////////////////////

ControlApp.controller('MeDetailCtrl', ['$scope', 'Restangular', 'me', function($scope, Restangular, me) {
  $scope.master = me;
  $scope.me = Restangular.copy($scope.master);
  $scope.errors = [];
}]);

////////////////////////////////////////////////////////////////////////
// Users
////////////////////////////////////////////////////////////////////////

ControlApp.controller('UserListCtrl', ['$scope', 'Restangular', function($scope, Restangular) {
  Restangular.all("users").getList().then(function(users) {
    $scope.users = users;
  });

  $scope.orderProp = 'name';
  $scope.canEditUsers = (ServerData.User.roles.indexOf('edit-users') != -1);
}]);

ControlApp.controller('UserCreateCtrl', ['$scope', '$location', 'Restangular', function($scope, $location, Restangular) {
  return UserEditCtrl($scope, $location, Restangular, Restangular.one('users'));
}]);

ControlApp.controller('UserEditCtrl', ['$scope', '$location', 'Restangular', 'user', function($scope, $location, Restangular, user) {
  $scope.master = user;
  if (!$scope.master._url) {
    // set defaults
    $scope.master.active = true;
    $scope.master.roles = ['view', 'edit', 'stats'];
  }
  $scope.master.roles_o = _.map($scope.master.roles, function(o) { return {'role': o}; });
  $scope.arrays = ['role'];
  $scope.user = Restangular.copy($scope.master);

  function gotoUserList() {
    $location.path('/users/');
  }

  $scope.cancel = function() {
    gotoUserList();
  };

  $scope.isClean = function() {
    return angular.equals($scope.master, $scope.user);
  };

  $scope.addRole = function() {
    $scope.user.roles_o.push({'role': 'view'});
  };

  $scope.removeRole = function(index) {
    $scope.user.roles_o.splice(index, 1);
  };

  $scope.save = function() {
    var i;
    for (i = 0; i < $scope.arrays.length; i++) {
      var name = $scope.arrays[i];
      var plural = name+'s';
      $scope.user[plural] = _.uniq(_.compact(_.map($scope.user[plural+'_o'], function(o) { return o[name]; } )));
    }

    if ($scope.user.password !== $scope.user.password2) {
      alert('The passwords need to match.');
      return;
    }

    var promise;
    if (!!$scope.master._url) {
      // existing user
      promise = $scope.user.put();
    } else {
      // new zone
      promise = $scope.user.post();
    }

    promise.then(gotoUserList, function (response) {
      if (response.status === 422) {
        $scope.errors = [];
        _.each(response.data.errors, function(field, desc) {
          $scope.userForm.$setValidity("userForm." + field + ".$invalid", false);
        });
        if (response.data.error) {
          $scope.errors.push(response.data.error);
        }
      } else {
        alert('Server reported unexpected error ' + response.status);
      }
    });
  };
}]);
