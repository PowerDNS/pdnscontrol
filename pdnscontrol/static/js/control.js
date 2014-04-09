// Controlling Application
"use strict";

var ControlApp = angular.module('control', [
  'ngRoute',
  'models',
  'components',
  'graphite',
  'xeditable',
  'ControlApp.controllers.me',
  'ControlApp.controllers.server',
  'ControlApp.controllers.ui',
  'ControlApp.controllers.user',
  'ControlApp.controllers.zone',
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
        controller: 'ServerDetailCtrl',
        templateUrl: templateUrl('server/detail'),
        resolve: {
          server: ServerResolver
        }
      }).
      when('/server/:serverName/edit', {
        controller: 'ServerEditCtrl',
        templateUrl: templateUrl('server/edit'),
        resolve: {
          server: ServerResolver
        }
      }).
      when('/server/:serverName/config', {
        controller: 'ServerDetailCtrl',
        templateUrl: templateUrl('server/config'),
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
      when('/server/:serverName/statistics', {
        controller: 'ServerDetailCtrl',
        templateUrl: templateUrl('server/statistics'),
        resolve: {
          server: ServerResolver
        }
      }).
      when('/server/:serverName/zones', {
        controller: 'ServerDetailCtrl',
        templateUrl: templateUrl('server/zones'),
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
      return moment(value).fromNow().replace(' ago', '');
    };
  }).
  filter('full_and_rel_timestamp', function() {
    return function(value) {
      if (!value) {
        return '';
      }
      var m = moment(value);
      return m.format('LLLL') + " (" + m.fromNow().replace(' ago', '') + ")";
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
  }).
  filter('checkmark', function() {
    return function(input) {
      return input ? '\u2714' : '\u2718';
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


////////////////////////////////////////////////////////////////////////
// Servers
////////////////////////////////////////////////////////////////////////

function gotoServerSearchData($location, server, q) {
  $location.path('/server/'+server.name+'/search-data').search({'q': q});
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

