// Controlling Application
var ControlApp = angular.module('control', [
  'ngRoute',
  'models',
  'components',
  'graphite',
  'ngGrid',
  'services.breadcrumbs',
  'services.httpRequestTracker'
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
  ["$log","$window",
   function($log, $window){
     function error(exception, cause){
       // preserve the default behaviour which will log the error
       // to the console, and allow the application to continue running.
       $log.error.apply($log, arguments);

       alert('Something went wrong.\n' + exception.toString());
     }
     return(error);
   }]
);

////////////////////////////////////////////////////////////////////////
// Shared object resolver functions
////////////////////////////////////////////////////////////////////////

function ServerResolver(Restangular, $route) {
  return Restangular.one('servers', $route.current.params.serverName).get();
}

function ZoneResolver(Restangular, $route) {
  return Restangular.one('servers', $route.current.params.serverName).one('zones', $route.current.params.zoneId).get();
}

function ConfigResolver(Restangular, $route) {
  return Restangular.one('servers', $route.current.params.serverName).one('config', $route.current.params.configName).get();
}

function MeResolver(Restangular, $route) {
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
      when('/', {controller:ServerListCtrl, templateUrl: templateUrl('server/list')}).
      when('/server/:serverName', {
        controller:ServerDetailCtrl, templateUrl: templateUrl('server/detail'),
        resolve: {
          server: ServerResolver
        }
      }).
      when('/server/:serverName/edit', {
        controller:ServerEditCtrl, templateUrl: templateUrl('server/edit'),
        resolve: {
          server: ServerResolver
        }
      }).
      when('/server/:serverName/config/:configName/edit', {
        controller:ConfigEditCtrl, templateUrl: templateUrl('config/edit'),
        resolve: {
          server: ServerResolver,
          config: ConfigResolver
        }
      }).
      when('/server/:serverName/zone/:zoneId', {
        controller:ZoneDetailCtrl, templateUrl: templateUrl('zone/detail'),
        resolve: {
          server: ServerResolver,
          zone: ZoneResolver
        }
      }).
      when('/server/:serverName/zone/:zoneId/edit', {
        controller:ZoneEditCtrl, templateUrl: templateUrl('zone/edit'),
        resolve: {
          server: ServerResolver,
          zone: ZoneResolver
        }
      }).
      when('/server/:serverName/zones/new', {
        controller: ZoneCreateCtrl, templateUrl: templateUrl('zone/edit'),
        resolve: {
          server: ServerResolver
        }
      }).
      when('/servers/new', {
        controller: ServerCreateCtrl, templateUrl: templateUrl('server/edit')
      }).
      when('/me', {
        controller: MeDetailCtrl, templateUrl: templateUrl('me/detail'),
        resolve: {
          me: MeResolver
        }
      });

    if (ServerData.User.roles.indexOf('view-users') != -1) {
      $routeProvider.
        when('/users', {
          controller:UserListCtrl, templateUrl: templateUrl('user/list')
        });
    }
    if (ServerData.User.roles.indexOf('edit-users') != -1) {
      $routeProvider.
        when('/user/:userId/edit', {
          controller:UserEditCtrl, templateUrl: templateUrl('user/edit'),
          resolve: {
            user: UserResolver
          }
        }).
        when('/users/new', {
          controller:UserCreateCtrl, templateUrl: templateUrl('user/edit')
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
    }
  }).
  filter('rel_timestamp', function() {
    return function(value) {
      if (!value) {
        return 'unknown';
      }
      return moment(value).fromNow();
    }
  }).
  filter('full_and_rel_timestamp', function() {
    return function(value) {
      if (!value) {
        return '';
      }
      var m = moment(value);
      return m.format('LLLL') + " (" + m.fromNow() + ")";
    }
  }).
  filter('full_timestamp', function() {
    return function(value) {
      if (!value) {
        return '';
      }
      return moment(value).format('LLLL');
    }
  }).
  filter('short_timestamp', function() {
    return function(value) {
      if (!value) {
        return '';
      }
      return moment(value).format('L HH:mm:ss');
    }
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
    }
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
        if ($scope.query.length == 0) {
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
          popupScope.logSearchGrid = {
            data: 'logData',
            enableRowSelection: false,
            columnDefs: [
              {field: 'date', displayName: 'Date', width: 200, cellFilter: 'short_timestamp'},
              {field: 'hostname', displayName: 'Hostname', width: '80'},
              {field: 'message', displayName: 'Message',}
            ]
          };

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
  }
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
        if (scope.spinning != spin) {
          if (spin == true) {
            spinner.spin(elm[0]);
          } else {
            spinner.stop();
          }
          scope.spinning = spin;
        }
      });
    }
  }
});


////////////////////////////////////////////////////////////////////////
// Base UI
////////////////////////////////////////////////////////////////////////

function NavCtrl($scope, breadcrumbs, httpRequestTracker) {
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
      if (raw[0].name == 'server' || raw[0].name == '') {
        filtered.push({name: 'Servers', path: '/servers'});
        if (raw[1]) {
          filtered.push(raw[1]);
          if (raw[2] && raw[3]) {
            filtered.push(raw[3]);
          }
        }
      } else if (raw[0].name == 'user' || raw[0].name == 'users') {
        filtered.push({name: 'Users', path: '/users'});
      }
    }
    rawCache = raw;
    return filtered;
  };
}

////////////////////////////////////////////////////////////////////////
// Servers
////////////////////////////////////////////////////////////////////////

function ServerListCtrl($scope, $compile, $filter, Restangular) {
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
      return server.daemon_type == 'Recursor';
    });
  }
  $scope.authoritatives = function() {
    return _.filter($scope.selected_servers(), function(server) {
      return server.daemon_type == 'Authoritative';
    });
  }

  $scope.auth_answers = function() {
    var sources, servers;
    sources = 'nonNegativeDerivative(%SOURCE%.udp-answers)';

    servers = $scope.authoritatives();
    servers = _.map(servers, function(server) {
      var source = server.graphite_name;
      return 'sumSeries(' + sources.replace(/%SOURCE%/g, source) + ')';
    });
    if (servers.length == 0) {
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
    if (servers.length == 0) {
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
    if (servers.length == 0) {
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
    if (servers.length == 0) {
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
            if (requestCount == 0) {
              scope.loading = false;
            }
          }, function(response) {
            scope.results.push({server: server, output: 'Failed.'});
            scope.loading = false;
            requestCount -= 1;
            if (requestCount == 0) {
              scope.loading = false;
            }
          });
        });
      }
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
          if (requestCount == 0) {
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
      }
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
          if (requestCount == 0) {
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
      }
    });
  };
}

function ServerCreateCtrl($scope, $location, Restangular) {
  // set defaults
  $scope.server = {'daemon_type': 'Authoritative'};

  $scope.save = function() {
    Restangular.all("servers").post($scope.server).then(function(response) {
      $location.path('/server/' + $scope.server.name);
    }, function(response) {
      if (response.status == 422) {
        _.each(response.data.errors, function(field, desc) {
          $scope.serverForm.$setValidity("serverForm." + field + ".$invalid", false);
        });
      } else {
        alert('Server reported unexpected error ' + response.status);
      }
    });
  }

  $scope.cancel = function() {
    $location.path('/');
  }

  $scope.isClean = function() {
    return false;
  };
}

function ServerDetailCtrl($scope, $compile, $location, Restangular, server) {
  $scope.server = server;

  $scope.gridExtraStyle = function() {
    try {
      var h = $(window).height() - $(".tabs").offset()['top'] - $('footer').height() - $('.tabs').height();
      h -= 70; // account for padding/border/margin and '+ Add Zone' link
      return {height: h + "px"};
    } catch (e) {
      return {};
    }
  };

  $scope.zonesGridOptions = {
    data: 'zones',
    enableRowSelection: false,
    enableColumnResize: true,
    showFilter: true,
    menuTemplate: templateUrl('grid/menuTemplate'),
    sortInfo: { fields: ['name'], directions: ['asc'] },
    columnDefs: [
      {field: 'name', displayName: 'Name', cellTemplate: '<div class="ngCellText"><a href="/server/{{server._id}}/zone/{{row.entity._id}}">{{row.entity[col.field]}}</a> <a href="/server/{{server._id}}/zone/{{row.entity._id}}"><span class="foundicon-edit"/></a></div>', sortFn: dnsNameSort},
      {field: 'kind', displayName: 'Kind', width: '100'}
    ]
  };
  if ($scope.server.daemon_type == 'Recursor') {
    $scope.zonesGridOptions.columnDefs.push({field: 'servers', displayName: 'Forwarders', width: '200', cellFilter: 'array_join'});
    $scope.zonesGridOptions.columnDefs.push({field: 'recursion_desired', displayName: 'Recurse', width: '150', cellFilter: 'checkmark'});
  } else {
    $scope.zonesGridOptions.columnDefs.push({field: 'serial', displayName: 'Serial', width: '120'});
    $scope.zonesGridOptions.columnDefs.push({field: 'masters', displayName: 'Masters', cellTemplate: '<div class="ngCellText">{{row.entity[col.field] | array_join }}</div>', width: '250'});
  }

  function loadServerData() {
    $scope.server.all("zones").getList().then(function(zones) {
      $scope.zones = zones;
    }, function(response) {
      $scope.load_error = $scope.load_error || '';
      $scope.load_error += 'Loading zones failed';
    });
  }
  loadServerData();

  $scope.canEditConfig = function(varname) {
    return varname == 'allow-from';
  };

  $scope.configurationGridOptions = {
    data: 'configuration',
    enableRowSelection: false,
    enableColumnResize: true,
    showFilter: true,
    menuTemplate: templateUrl('grid/menuTemplate'),
    sortInfo: { fields: ['k', 'v'], directions: ['asc', 'asc'] },
    columnDefs: [
      {field: 'k', displayName: 'Name', width: '300', cellTemplate: '<div class="ngCellText">{{row.entity[col.field]}} <a href="/server/{{server._id}}/config/{{row.entity[col.field]}}/edit" ng-show="canEditConfig(row.entity[col.field])"><span class="foundicon-edit"/></a></div>'},
      {field: 'v', displayName: 'Value'}
    ]
  };
  $scope.$watch('server.config', function() {
    // _.pairs is not good enough, ngGrid can't sort on Arrays.
    $scope.configuration = simpleListToKVList($scope.server.config);
  });

  $scope.statisticsGridOptions = {
    data: 'statistics',
    enableRowSelection: false,
    enableColumnResize: true,
    showFilter: true,
    menuTemplate: templateUrl('grid/menuTemplate'),
    sortInfo: { fields: ['k', 'v'], directions: ['asc', 'asc'] },
    columnDefs: [
      {field: 'k', displayName: 'Name', width: '300'},
      {field: 'v', displayName: 'Value'}
    ]
  };
  $scope.$watch('server.stats', function() {
    // _.pairs is not good enough, ngGrid can't sort on Arrays.
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
      }
      // HACK: don't rely on setTimeout(, >0) here when we could use (, 0) or a callback from showPopup
      setTimeout(function() {
        angular.element("#flush_domain").focus();
      }, 100);
    });
  }

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
      }
    });
  }

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
      }
    });
  }
}

function ServerEditCtrl($scope, $location, Restangular, server) {
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
  }
}

////////////////////////////////////////////////////////////////////////
// (Server) Config
////////////////////////////////////////////////////////////////////////
function ConfigEditCtrl($scope, $compile, $location, Restangular, server, config) {
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
  }

  $scope.addOne();
}

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
    if (e == "") {
      return Array(10-chunks.length).join('0000');
    }
    return Array(5-e.length).join("0") + e;
  })).join('').split('').reverse().join('.');
  return rev + '.ip6.arpa';
}

function toRRsetMap(input) {
  var output = {};
  var i, qname, qtype;
  for (i = 0; i < input.length; i++) {
    qname = input[i].name;
    qtype = input[i].type;
    output[qname] = output[qname] || {};
    output[qname][qtype] = output[qname][qtype] || [];
    if (input[i].content) {
      // throws away empty comments
      output[qname][qtype].push(input[i]);
    }
  }
  return output;
}

function diffAB(a, b, diff_cb) {
  "use strict";

  var noChange = [], removed = [];
  var aIdx = a.length;
  while (aIdx--) {
    var found = false;
    var aEntry = a[aIdx];
    var bIdx = b.length;
    while (bIdx--) {
      var bEntry = b[bIdx];
      found = diff_cb(aEntry, bEntry);
      if (found)
        break;
    }
    if (found) {
      noChange.push(aEntry);
    } else {
      removed.push(aEntry);
    }
  }
  return {noChange: noChange, removed: removed};
}

function diffZone(master, current, key) {
  "use strict";

  function cmpNameType(a, b) {
    return a.name == b.name && a.type == b.type;
  }

  var removedNameTypes = diffAB(master[key], current[key], cmpNameType);
  var addedNameTypes = diffAB(current[key], master[key], cmpNameType);
  var noNameTypeChangeNameTypes = _.union(removedNameTypes.noChange, addedNameTypes.noChange);
  removedNameTypes = removedNameTypes.removed;
  addedNameTypes = addedNameTypes.removed;

    var changes = [];

    _.each(removedNameTypes, function(nt) {
      var change = {
        changetype: 'replace',
        name: nt.name,
        type: nt.type
      };
      change[key] = []; // required to do an actual delete
      changes.push(change);
    });

    _.each(addedNameTypes, function(nt) {
      var change = {
        changetype: 'replace',
        name: nt.name,
        type: nt.type
      };
      change[key] = _.filter(current[key], function(rr) {
        return cmpNameType(rr, nt);
      });
      changes.push(change);
    });

    _.each(noNameTypeChangeNameTypes, function(nt) {
      var entriesCurrent = _.filter(current[key], function(rr) {
        return cmpNameType(rr, nt);
      });
      var entriesMaster = _.filter(master[key], function(rr) {
        return cmpNameType(rr, nt);
      });
      var change;
      if (!angular.equals(entriesCurrent.sort(), entriesMaster.sort())) {
        change = {
          changetype: 'replace',
          name: nt.name,
          type: nt.type
        };
        change[key] = _.filter(current[key], function(rr) {
          return cmpNameType(rr, nt);
        });
        changes.push(change);
      }
    });
  return changes;
}

function ZoneDetailCtrl($scope, $compile, $location, $timeout, Restangular, server, zone) {
  var typeEditTemplate;

  $scope.server = server;
  $scope.loading = false;

  $scope.master = zone;
  $scope.zone = Restangular.copy($scope.master);

  $scope.isClean = function() {
    return angular.equals($scope.master, $scope.zone);
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
            return rec.name == ptr.revName && rec.type == 'PTR';
          });
          if (ptr.replacedRecords.length != 1 || ptr.replacedRecords[0].content != ptr.record.name) {
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
      if (matchingZones.length == 0) {
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
    if (newPTRs.length == 0) {
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
      }
    });
  }

  function doAutoPtr(zoneChanges) {
    var possiblePtrs = [];
    var change;
    // build possible PTR records from changes
    while (change = zoneChanges.pop()) {
      if (change.changetype != 'replace' || change.records.length == 0) {
        continue;
      }
      var rec;
      while (rec = change.records.pop()) {
        if (rec.disabled) {
          continue;
        }
        // build name of PTR record
        var revName;
        if (change.type == 'A') {
          revName = revNameIPv4(rec.content);
        } else if (change.type == 'AAAA') {
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
    function rrCmpSerialize(rr) {
      return '' + rr.name + '/' + rr.type + '/' + rr.ttl + '/' + rr.prio + '/' + rr.content + '/' + rr.disabled;
    }
    function commentCmpSerialize(c) {
      return '' + c.name + '/' + c.type + '/' + c.modified_at + '/' + c.account + '/' + c.content;
    }

    var commentChanges = [];
    if ($scope.master.comments !== undefined) {
      diffZone($scope.master, $scope.zone, 'comments');
    }
    var recordChanges = diffZone($scope.master, $scope.zone, 'records');
    var changes = _.compact(recordChanges); // copy

    // merge comment changes into record changes, if possible.
    var changeIdx = changes.length;
    while (changeIdx--) {
      if (changes[changeIdx].changetype != 'replace') {
        continue;
      }
      var commentIdx = commentChanges.length
      while (commentIdx--) {
        if (commentChanges[commentIdx].name == changes[changeIdx].name &&
            commentChanges[commentIdx].type == changes[changeIdx].type) {
          changes[changeIdx].comments = commentChanges[commentIdx].comments;
          commentChanges.splice(commentIdx, 1);
        }
      }
    }
    // everything left in commentChanges is now a comment-only change.
    // merge both arrays into a single change list.
    var change;
    while (change = commentChanges.pop()) {
      changes.push(change);
    }

    function sendNextChange(changes) {
      var change = changes.pop();
      if (change === undefined) {
        // done.
        // sort master and current so equals will return true.
        $scope.zone.records = _.sortBy($scope.zone.records, rrCmpSerialize);
        $scope.master.records = _.sortBy($scope.master.records, rrCmpSerialize);
        $scope.zone.comments = _.sortBy($scope.zone.comments, commentCmpSerialize);
        $scope.master.comments = _.sortBy($scope.master.comments, commentCmpSerialize);
        doAutoPtr(recordChanges);
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

        // replace data in master with saved data
        _.each(['comments', 'records'], function(key) {
          if (!change[key])
            return;

          var idx = $scope.master[key].length;
          while(idx--) {
            var row = $scope.master[key][idx];
            if (row.name == change.name && row.type == change.type) {
              $scope.master[key].splice(idx, 1);
            }
          }
          _.each(change[key], function(row) {
            row._new = undefined;
            $scope.master[key].push(_.extend({}, row));
          });
        });

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

  function focusRow(gridOptions, rowToSelect) {
    gridOptions.selectItem(rowToSelect, true);
    var grid = gridOptions.ngGrid;
    grid.$viewport.scrollTop(grid.rowMap[rowToSelect] * grid.config.rowHeight);
  }

  $scope.add = function() {
    // TODO: get default ttl from somewhere
    $scope.zone.records.push({name: $scope.zone.name, type: '', priority: 0, ttl: 3600, content: '', disabled: false, _new: true});
    $timeout(function() {
      focusRow($scope.recordsGridOptions, $scope.zone.records.length-1);
    }, 100);
  };

  $scope.isNotifyAllowed = ($scope.zone.kind.toUpperCase() == 'MASTER' && server.mustDo('master')) || ($scope.zone.kind.toUpperCase() == 'SLAVE' && server.mustDo('slave-renotify'));
  $scope.isUpdateFromMasterAllowed = ($scope.zone.kind.toUpperCase() == 'SLAVE');
  $scope.isChangeAllowed = (($scope.zone.kind.toUpperCase() != 'SLAVE') && ($scope.server.daemon_type == 'Authoritative'));
  $scope.canExport = ($scope.server.daemon_type == 'Authoritative');

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

  var rrTypesSort = function(a,b) {
    var typeA = _.findWhere($scope.rrTypes, {name: a}) || {};
    var typeB = _.findWhere($scope.rrTypes, {name: b}) || {};
    var weightA = typeA.sortWeight || 0;
    var weightB = typeB.sortWeight || 0;
    if (weightA < weightB) {
      return -1;
    }
    if (weightA > weightB) {
      return 1;
    }
    if (a == b) return 0;
    if (a < b) return 1;
    return -1;
  };

  $scope.rrTypes = [
    {name: 'SOA', required: true, allowCreate: false, sortWeight: -100},
    {name: 'A'},
    {name: 'AAAA'},
    {name: 'NS', sortWeight: -50},
    {name: 'CNAME'},
    {name: 'MR'},
    {name: 'PTR'},
    {name: 'HINFO'},
    {name: 'MX'},
    {name: 'TXT'},
    {name: 'RP'},
    {name: 'AFSDB'},
    {name: 'SIG'},
    {name: 'KEY'},
    {name: 'LOC'},
    {name: 'SRV'},
    {name: 'CERT'},
    {name: 'NAPTR'},
    {name: 'DS', sortWeight: -50},
    {name: 'SSHFP'},
    {name: 'RRSIG'},
    {name: 'NSEC'},
    {name: 'DNSKEY'},
    {name: 'NSEC3'},
    {name: 'NSEC3PARAM'},
    {name: 'TLSA'},
    {name: 'SPF'},
    {name: 'DLV'}
  ];
  $scope.creatableRRTypes = _.filter($scope.rrTypes, function(t) {
    if (t.allowCreate === undefined)
      return true;
    return t.allowCreate;
  });
  typeEditTemplate = '<select ng-model="COL_FIELD" required ng-options="rrType.name as rrType.name for rrType in creatableRRTypes" ng-show="!!row.entity._new"></select><div class="ngCellText" ng-show="!!!row.entity._new">{{COL_FIELD}}</div>';

  checkboxEditTemplate = '<input type=checkbox required ng-class="\'colt\' + col.index" ng-input="COL_FIELD" ng-model="COL_FIELD">';
  checkboxViewTemplate = '<div class="ngCellText" ng-class=\"col.colIndex()\"><input type=checkbox required ng-model="COL_FIELD" ng-disabled="!isChangeAllowed"></div>';
  $scope.stripZone = function(val) {
    var val = val;
    if (val.substring(val.lastIndexOf('.'+$scope.zone.name)) == '.'+$scope.zone.name) {
      val = val.substring(0, val.lastIndexOf('.'+$scope.zone.name));
    } else if (val == $scope.zone.name) {
      val = '';
    }
    return val;
  };
  $scope.stripLabel = function(val) {
    var val = val;
    if (val.substring(val.lastIndexOf('.'+$scope.zone.name)) == '.'+$scope.zone.name) {
      val = $scope.zone.name;
    } else if (val == $scope.zone.name) {
      val = $scope.zone.name;
    } else {
      val = ''; // zone name missing
    }
    return val;
  };
  nameViewTemplate = '<div class="ngCellText">{{stripZone(row.getProperty(col.field))}}<span class="zoneName">.{{stripLabel(row.getProperty(col.field))}}</span></div>';
  nameEditTemplate = '';

  var typesWithPriority = ['MX', 'SRV'];
  $scope.prioVisible = function(row) {
    return (typesWithPriority.indexOf(row.getProperty('type')) != -1) || (row.getProperty('priority') > 0);
  };
  prioViewTemplate = '<div class="ngCellText"><span ng-show="prioVisible(row)">{{row.getProperty(col.field)}}</span></div>';

  $scope.updateCommentCache = function() {
    $scope.commentCache = toRRsetMap($scope.zone.comments || []);
  };
  $scope.updateCommentCache();

  $scope.commentCount = function(ngRow) {
    var record = ngRow.entity;
    if (!$scope.commentCache[record.name]) {
      return 0;
    }
    return ($scope.commentCache[record.name][record.type] || []).length;
  };
  $scope.editComment = function(ngRow) {
    var record = ngRow.entity;
    showPopup($scope, $compile, 'zone/edit_comment', function(scope) {
      $scope.record = record;
    });
  };
  $scope.canDelete = function(ngRow) {
    if (!$scope.isChangeAllowed)
      return false;
    if (ngRow.entity.type == 'SOA' && $scope.zone.name == ngRow.entity.name)
      return false;
    return true;
  }
  $scope.deleteRow = function(ngRow) {
    if (!$scope.canDelete(ngRow))
      return;
    $scope.zone.records.splice($scope.zone.records.indexOf(ngRow.entity), 1);
  };

  $scope.calcGridExtraStyle = function() {
    // HACK: 100px are whatever?
    return {height: ($(window).height() - $(".gridStyle").offset()['top'] - 100) + "px"};
  };

  $scope.mySelections = [];
  var preliminaryOptions = {
    data: 'zone.records',
    enableRowSelection: false,
    enableCellEditOnFocus: false,
    enableCellSelection: false,
    enableCellEdit: $scope.isChangeAllowed,
    enableColumnResize: true,
    showSelectionCheckbox: false,
    showFilter: true,
    menuTemplate: templateUrl('grid/menuTemplate'),
    sortInfo: {
      fields: ['name', 'type', 'priority', 'content', 'ttl', 'disabled'],
      directions: ['asc', 'asc', 'asc', 'asc', 'asc', 'asc']
    },
    selectedItems: $scope.mySelections,
    columnDefs: [
      {field: 'name', displayName: 'Name', enableCellEdit: $scope.isChangeAllowed, cellTemplate: nameViewTemplate, editableCellTemplate: nameEditTemplate, resizable: true, width: '20%', sortFn: dnsNameSort},
      {field: 'disabled', displayName: 'Dis.', width: '40', enableCellEdit: $scope.isChangeAllowed, editableCellTemplate: checkboxEditTemplate, cellTemplate: checkboxViewTemplate },
      {field: 'type', displayName: 'Type', width: '70', enableCellEdit: $scope.isChangeAllowed, editableCellTemplate: typeEditTemplate, sortFn: rrTypesSort},
      {field: 'ttl', displayName: 'TTL', width: '60', enableCellEdit: $scope.isChangeAllowed},
      {field: 'priority', displayName: 'Prio', width: '40', enableCellEdit: $scope.isChangeAllowed, cellTemplate: prioViewTemplate},
      {field: 'content', displayName: 'Data', enableCellEdit: $scope.isChangeAllowed},
    ]
  };

  $scope.commentsSupported = ($scope.zone.comments !== undefined);

  if ($scope.isAllowedChange || $scope.commentsSupported) {
    preliminaryOptions.columnDefs.splice(0, 0,
      {field: '_', displayName: '', cellTemplate: templateUrl('zone/recordsgrid-rowmeta'), enableCellEdit: false, groupable: false, resizable: false, sortable: false, width: ($scope.isChangeAllowed ? 50 : 20)});
  }

  $scope.recordsGridOptions = preliminaryOptions;
}

function ZoneCommentCtrl($scope, Restangular) {
  var qname = $scope.record.name;
  var qtype = $scope.record.type;

  // make our own comment_map
  var comment_map = toRRsetMap($scope.zone.comments || []);
  comment_map[qname] = comment_map[qname] || {};
  comment_map[qname][qtype] = comment_map[qname][qtype] || [];

  $scope.master = comment_map[qname][qtype];
  $scope.comments = Restangular.copy($scope.master);

  $scope.isClean = function() {
    return angular.equals($scope.master, $scope.comments);
  }
  $scope.addComment = function() {
    $scope.comments.push({'content': '', 'account': ServerData.User.email, '_new': true, 'name': qname, 'type': qtype});
  }
  $scope.removeComment = function(index) {
    $scope.comments.splice(index, 1);
  }
  $scope.close = function() {
    // remove previous comments for this RRset
    $scope.zone.comments = _.filter($scope.zone.comments, function(c) {
      return !(c.name == qname && c.type == qtype);
    });
    _.each($scope.comments, function(c) {
      if (c.content) {
        if (!c.modified_at) {
          c.modified_at = moment().unix();
        }
        $scope.zone.comments.push(c);
      }
    });
    if ($scope.updateCommentCache) {
      $scope.updateCommentCache();
    }
    $scope.$emit("finished");
  }

  // be nice and allow instant typing into a new comment
  if ($scope.isChangeAllowed) {
    $scope.addComment();
  }
}

function ZoneCreateCtrl($scope, $location, Restangular, server) {
  return ZoneEditCtrl($scope, $location, Restangular, server, server.one('zones'));
}

function ZoneEditCtrl($scope, $location, Restangular, server, zone) {
  $scope.server = server;
  $scope.master = zone;
  $scope.errors = [];

  if (server.daemon_type == 'Recursor') {
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
    return $scope.zone.kind == 'Slave';
  };

  $scope.addNameserver = function() {
    $scope.zone.nameservers_o.push({'nameserver': ''});
  };

  $scope.removeNameserver = function(index) {
    $scope.zone.nameservers_o.splice(index, 1);
  };

  $scope.showNameservers = function() {
    return (!($scope.master._url)) && (server.daemon_type == 'Authoritative');
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
    return $scope.zone.kind == 'Forwarded';
  };

  $scope.cancel = function() {
    var url = '/server/' + $scope.server.name;
    if (!!$scope.master._url) {
      url += '/zone/' + $scope.zone.id;
    }
    $location.path(url);
  }

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
        if (response.status == 422) {
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
}

////////////////////////////////////////////////////////////////////////
// Me -- currently logged in user
////////////////////////////////////////////////////////////////////////

function MeDetailCtrl($scope, $location, Restangular, me) {
  $scope.master = me;
  $scope.me = Restangular.copy($scope.master);
  $scope.errors = [];
}

////////////////////////////////////////////////////////////////////////
// Users
////////////////////////////////////////////////////////////////////////

function UserListCtrl($scope, $compile, Restangular) {
  Restangular.all("users").getList().then(function(users) {
    $scope.users = users;
  });

  $scope.orderProp = 'name';
  $scope.canEditUsers = (ServerData.User.roles.indexOf('edit-users') != -1);
}

function UserCreateCtrl($scope, $location, Restangular) {
  return UserEditCtrl($scope, $location, Restangular, Restangular.one('users'));
}

function UserEditCtrl($scope, $location, Restangular, user) {
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
  }

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

    if ($scope.user.password != $scope.user.password2) {
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
      if (response.status == 422) {
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
}
