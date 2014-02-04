// Controlling Application
var ControlApp = angular.module('control', ['models', 'components', 'graphite', 'ngGrid']);

////////////////////////////////////////////////////////////////////////
// Shared object resolver functions
////////////////////////////////////////////////////////////////////////

function ServerResolver(Restangular, $route) {
  return Restangular.one('servers', $route.current.params.serverName).get();
}

function ZoneResolver(Restangular, $route) {
  return Restangular.one('servers', $route.current.params.serverName).one('zones', $route.current.params.zoneId).get();
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
      when('/servers/new', {controller: ServerCreateCtrl, templateUrl: templateUrl('server/edit')}).
      otherwise({redirectTo: '/'});
  });

////////////////////////////////////////////////////////////////////////
// Filters
////////////////////////////////////////////////////////////////////////

ControlApp.
  filter('relative_time', function() {
    return function(value) {
      if (value === undefined) {
        return 'unknown';
      }
      return moment.duration(1.0 * value, "seconds").humanize();
    }
  }).
  filter('absolute_time', function() {
    return function(value) {
      if (value === undefined) {
        return '';
      }
      var m = moment().subtract('seconds', value);
      return m.format('LLLL') + " (" + m.fromNow() + ")";
    }
  }).
  filter('absolute_date', function() {
    return function(value) {
      if (value === undefined) {
        return 'unknown';
      }
      return moment(value).fromNow();
    }
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
      $scope.load_error = '';
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
          popupScope.logSearchGrid = {
            data: 'logData',
            enableRowSelection: false,
            columnDefs: [
              {field: 'date', displayName: 'Date', width: 200, cellFilter: 'absolute_date'},
              {field: 'hostname', displayName: 'Hostname', width: '80'},
              {field: 'message', displayName: 'Message',}
            ]
          };

          _.each(servers, function(server) {
            server.log_grep({needle: $scope.query}).then(function(response) {
              popupScope.logData.push.apply(popupScope.logData, _.map(response.content, function(line) {
                var date_hostname = line.split(' ', 2);
                var message = line.substring(date_hostname[0].length + date_hostname[1].length + 2);
                return {
                  date: date_hostname[0],
                  hostname: date_hostname[1],
                  message: message
                };
              }));
            }, function(response) {
              $scope.load_error += 'Search failed for server X';
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
// Servers
////////////////////////////////////////////////////////////////////////

function ServerListCtrl($scope, $compile, Restangular) {
  Restangular.all("servers").getList().then(function(servers) {
    $scope.servers = servers;
    _.each($scope.servers, function(server) {
      server.selected = true;
    });
  });

  $scope.orderProp = 'name';

  $scope.recursors = function() {
    return _.filter($scope.servers, function(server) { return server.daemon_type == 'Recursor'; });
  }

  $scope.auth_answers = function() {
    var sources, servers;
    servers = _.filter($scope.servers, function(server) { return server.daemon_type == 'Authoritative'; });

    sources = 'nonNegativeDerivative(%SOURCE%.udp-answers)';

    servers = _.map(servers, function(server) {
      var source = server.graphite_name;
      return 'sumSeries(' + sources.replace(/%SOURCE%/g, source) + ')';
    });

    return "sumSeries(" + servers.join(',') + ")";
  };

  $scope.auth_queries = function() {
    var sources, servers;
    servers = _.filter($scope.servers, function(server) { return server.daemon_type == 'Authoritative'; });

    sources = 'nonNegativeDerivative(%SOURCE%.udp-queries)';

    servers = _.map(servers, function(server) {
      var source = server.graphite_name;
      return 'sumSeries(' + sources.replace(/%SOURCE%/g, source) + ')';
    });

    return "sumSeries(" + servers.join(',') + ")";
  };

  $scope.recursor_answers = function() {
    var sources, servers;
    servers = _.filter($scope.servers, function(server) { return server.daemon_type == 'Recursor'; });

    sources = _.map(['answers0-1', 'answers1-10', 'answers10-100', 'answers100-1000', 'answers-slow', 'packetcache-hits'], function(val) {
      return 'nonNegativeDerivative(%SOURCE%.' + val + ')';
    }).join(',');

    servers = _.map(servers, function(server) {
      var source = server.graphite_name;
      return 'sumSeries(' + sources.replace(/%SOURCE%/g, source) + ')';
    });

    return "sumSeries(" + servers.join(',') + ")";
  };

  $scope.recursor_queries = function() {
    var sources, servers;
    servers = _.filter($scope.servers, function(server) { return server.daemon_type == 'Recursor'; });

    sources = _.map(['answers0-1', 'answers1-10', 'answers10-100', 'answers100-1000', 'answers-slow', 'packetcache-hits'], function(val) {
      return 'nonNegativeDerivative(%SOURCE%.' + val + ')';
    }).join(',');

    servers = _.map(servers, function(server) {
      var source = server.graphite_name;
      return 'sumSeries(' + sources.replace(/%SOURCE%/g, source) + ')';
    });

    return "sumSeries(" + servers.join(',') + ")";
  };

  $scope.selected_servers = function() {
    // TODO: apply 'filter' filter (name match)
    return _.filter($scope.servers, function(server) { return server.selected; });
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
    showPopup($scope, $compile, 'server/shutdown_multi.html', function(scope) {
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

  $scope.popup_deploy = function() {
    showPopup($scope, $compile, 'server/deploy', function(scope) {
    });
  };
}

function ServerCreateCtrl($scope, $location, Restangular) {
  window.CC = this;
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
}

function ServerDetailCtrl($scope, $compile, $location, Restangular, server) {
  $scope.server = server;

  $scope.flush_cache = function() {
    alert('flush!');
  };

  $scope.shutdown = function() {
    alert('shutdown');
  };

  $scope.zonesGridOptions = {
    data: 'zones',
    enableRowSelection: false,
    columnDefs: [
      {field: 'name', displayName: 'Name', cellTemplate: '<div class="ngCellText"><a href="/server/{{server._id}}/zone/{{row.entity._id}}">{{row.entity[col.field]}}</div></a>'},
      {field: 'kind', displayName: 'Kind'}
    ]
  };
  if ($scope.server.daemon_type == 'Recursor') {
    $scope.zonesGridOptions.columnDefs.push({field: 'forwarders', displayName: 'Forwarders'});
    $scope.zonesGridOptions.columnDefs.push({field: 'rdbit', displayName: 'Recursion Desired', cellFilter: 'checkmark'});
  } else {
    $scope.zonesGridOptions.columnDefs.push({field: 'masters', displayName: 'Masters', cellTemplate: '<div class="ngCellText">{{row.entity[col.field] | array_join }}</div>'});
    $scope.zonesGridOptions.columnDefs.push({field: 'serial', displayName: 'Serial'});
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

  $scope.configurationGridOptions = {
    data: 'configuration',
    enableRowSelection: false,
    columnDefs: [
      {field: '0', displayName: 'Name'},
      {field: '1', displayName: 'Value'}
    ]
  };
  $scope.$watch('server.config', function() {
    $scope.configuration = _.pairs($scope.server.config);
  });

  $scope.statisticsGridOptions = {
    data: 'statistics',
    enableRowSelection: false,
    columnDefs: [
      {field: '0', displayName: 'Name'},
      {field: '1', displayName: 'Value'}
    ]
  };
  $scope.$watch('server.stats', function() {
    $scope.statistics = _.pairs($scope.server.stats);
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

  $scope.popup_deploy = function() {
    showPopup($scope, $compile, 'server/deploy', function(scope) {
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
    $scope.master.remove().then(function() {
      $location.path('/');
    });
  };

  $scope.save = function() {
    $scope.server.put().then(function() {
      $location.path('/server/' + $scope.server.name);
    });
  };
}


////////////////////////////////////////////////////////////////////////
// Zones
////////////////////////////////////////////////////////////////////////

function ZoneDetailCtrl($scope, $compile, $location, Restangular, server, zone) {
  var typeEditTemplate;

  $scope.server = server;
  $scope.loading = false;

  $scope.master = zone;

  $scope.zone = Restangular.copy($scope.master);

  $scope.isClean = function() {
    return angular.equals($scope.master, $scope.zone);
  };

  $scope.isDeletePossible = function() {
    // Must have at least one selected row, and no row's type can have allowDelete=false.
    var selectedTypes;
    if ($scope.mySelections.length == 0)
      return false;
    selectedTypes = _.map($scope.mySelections, function(row) { return _.findWhere($scope.rrTypes, {name: row.type}); });
    return _.every(selectedTypes, function(type) {
      return (type && type.allowDelete !== undefined) ? type.allowDelete : true;
    });
  };

  $scope.save = function() {
    function pluckNameTypes(source) {
      return _.uniq(_.map(source, rrToNameType));
    }
    function rrToNameType(rr) {
      return '' + escape(rr['name']) + '/' + escape(rr['type']);
    }
    function unpackNameType(nt) {
      return _.map(nt.split('/'), unescape);
    }
    function compareNameTypeAndRR(rr, nt) {
      return rrToNameType(rr) == nt;
    }
    function rrCmpSerialize(rr) {
      return '' + rr.name + '/' + rr.type + '/' + rr.ttl + '/' + rr.prio + '/' + rr.content + '/' + rr.disabled;
    }

    var currentNameTypes = pluckNameTypes($scope.zone.records);
    var masterNameTypes = pluckNameTypes($scope.master.records);
    var removedNameTypes = _.difference(masterNameTypes, currentNameTypes);
    var addedNameTypes = _.difference(currentNameTypes, masterNameTypes);
    var noNameChangeNameTypes = _.intersection(masterNameTypes, currentNameTypes);

    var changes = [];

    _.each(removedNameTypes, function(nt) {
      var nt_ = unpackNameType(nt);
      changes.push({
        changetype: 'delete',
        name: nt_[0],
        type: nt_[1]
      });
    });

    _.each(addedNameTypes, function(nt) {
      var nt_ = unpackNameType(nt);
      changes.push({
        changetype: 'replace',
        name: nt_[0],
        type: nt_[1],
        records: _.filter($scope.zone.records, function(rr) {
          return compareNameTypeAndRR(rr, nt);
        })
      });
    });

    _.each(noNameChangeNameTypes, function(nt) {
      var nt_ = unpackNameType(nt);
      var recordsCurrent = _.filter($scope.zone.records, function(rr) {
        return compareNameTypeAndRR(rr, nt);
      });
      var recordsMaster = _.filter($scope.master.records, function(rr) {
        return compareNameTypeAndRR(rr, nt);
      });
      if (!angular.equals(recordsCurrent.sort(), recordsMaster.sort())) {
        changes.push({
          changetype: 'replace',
          name: nt_[0],
          type: nt_[1],
          records: _.filter($scope.zone.records, function(rr) {
            return compareNameTypeAndRR(rr, nt);
          })
        });
      }
    });

    function sendNextChange(changes) {
      var change = changes.pop();
      if (change === undefined) {
        // done.
        // sort master and current so equals will return true.
        $scope.zone.records = _.sortBy($scope.zone.records, rrCmpSerialize);
        $scope.master.records = _.sortBy($scope.master.records, rrCmpSerialize);
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
        _.each($scope.master.records, function(row) {
          if (row.name == change.name && row.type == change.type) {
            $scope.master.records.splice($scope.master.records.indexOf(row), 1);
          }
        });
        _.each(change.records, function(row) {
          row._new = undefined;
          $scope.master.records.push(_.extend({}, row));
        });

        sendNextChange(changes);
      }, function(errorResponse) {
        $scope.errors.push(errorResponse.data.error || 'Unknown server error');
      });
    }

    window.X = $scope;
    $scope.errors = [];
    sendNextChange(changes);
  };

  var typesWithPriority = ['MX', 'SRV'];

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
    });
  };

  $scope.add = function() {
    // TODO: get default ttl from somewhere
    $scope.zone.records.push({name: $scope.zone.name, type: '', priority: 0, ttl: 3600, content: '', disabled: false, _new: true});
  };

  $scope.delete_selected = function() {
    var row;
    while(row = $scope.mySelections.pop()) {
      var idx = $scope.zone.records.indexOf(row);
      if (idx != -1) {
        $scope.zone.records.splice(idx, 1);
      }
    }
  };

  $scope.isNotifyAllowed = ($scope.zone.kind.toUpperCase() == 'MASTER' && server.mustDo('master')) || ($scope.zone.kind.toUpperCase() == 'SLAVE' && server.mustDo('slave-renotify'));
  $scope.isUpdateFromMasterAllowed = ($scope.zone.kind.toUpperCase() == 'SLAVE');
  $scope.isChangeAllowed = ($scope.zone.kind.toUpperCase() != 'SLAVE');

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

  var rrTypesSort = function(a,b) {
    var typeA = _.findWhere($scope.rrTypes, {name: a});
    var typeB = _.findWhere($scope.rrTypes, {name: b});
    var weightA = typeA.sortWeight || 0;
    var weightB = typeB.sortWeight || 0;
    if (weightA < weightB) {
      return 1;
    }
    if (weightA > weightB) {
      return -1;
    }
    return a > b;
  };

  $scope.rrTypes = [
    {name: 'SOA', required: true, allowDelete: false, sortWeight: -100},
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
  typeEditTemplate = '<select ng-model="COL_FIELD" required ng-options="rrType.name as rrType.name for rrType in rrTypes" ng-show="!!row.entity._new"></select><div class="ngCellText" ng-show="!!!row.entity._new">{{COL_FIELD}}</div>';
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
  nameViewTemplate = '<div class="ngCellText">{{stripZone(row.getProperty(col.field))}}<span class="zoneName">.{{zone.name}}</span></div>';
  nameEditTemplate = '';

  $scope.mySelections = [];
  $scope.recordsGridOptions = {
    data: 'zone.records',
    enableRowSelection: true,
    enableCellEditOnFocus: false,
    enableCellSelection: true,
    enableCellEdit: $scope.isChangeAllowed,
    showSelectionCheckbox: $scope.isChangeAllowed,
    selectWithCheckboxOnly: true,
    showFilter: true,
    sortInfo: { fields: ['name', 'type', 'priority', 'content'], directions: ['ASC', 'ASC', 'ASC', 'ASC'] },
    selectedItems: $scope.mySelections,
    columnDefs: [
      {field: 'name', displayName: 'Name', enableCellEdit: $scope.isChangeAllowed, cellTemplate: nameViewTemplate, editableCellTemplate: nameEditTemplate},
      {field: 'disabled', displayName: 'Dis.', width: '40', enableCellEdit: $scope.isChangeAllowed, editableCellTemplate: checkboxEditTemplate, cellTemplate: checkboxViewTemplate },
      {field: 'type', displayName: 'Type', width: '60', enableCellEdit: $scope.isChangeAllowed, editableCellTemplate: typeEditTemplate, sortFn: rrTypesSort},
      {field: 'ttl', displayName: 'TTL', width: '60', enableCellEdit: $scope.isChangeAllowed},
      {field: 'priority', displayName: 'Prio', width: '40', enableCellEdit: $scope.isChangeAllowed},
      {field: 'content', displayName: 'Data', enableCellEdit: $scope.isChangeAllowed},
    ]
  };

  window.z = $scope.zone;
  window.R = Restangular;
}

function ZoneCreateCtrl($scope, $location, Restangular, server) {
  $scope.server = server;
  $scope.master = server.one('zones');
  $scope.master.kind = 'Native';
  $scope.master.masters_o = [];
  $scope.master.nameservers_o = [{'nameserver': ''}, {'nameserver': ''}];
  $scope.zone = Restangular.copy($scope.master);
  $scope.errors = [];

  $scope.isClean = function() {
    return angular.equals($scope.master, $scope.zone);
  };

  $scope.destroy = function() {
    $scope.master.remove().then(function() {
      $location.path('/server/' + $scope.server.name);
    });
  };

  $scope.save = function() {
    $scope.zone.masters = _.compact(_.map($scope.zone.masters_o, function(o) { return o['master']; } ));
    $scope.zone.nameservers = _.compact(_.map($scope.zone.nameservers_o, function(o) { return o['nameserver']; } ));
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
  };

  $scope.addMaster = function() {
    $scope.zone.masters_o.push({'master': ''});
  };

  $scope.removeMaster = function(index) {
    $scope.zone.masters_o.splice(index, 1);
  };

  $scope.canAddMaster = function() {
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
}

function ZoneEditCtrl($scope, $location, Restangular, server, zone) {
  $scope.server = server;
  $scope.master = zone;
  $scope.master.masters_o = _.map($scope.master.masters, function(o) { return {'master': o}; });
  $scope.master.nameservers_o = _.map($scope.master.nameservers, function(o) { return {'nameserver': o}; });
  $scope.zone = Restangular.copy($scope.master);

  $scope.isClean = function() {
    return angular.equals($scope.master, $scope.zone);
  };

  $scope.destroy = function() {
    $scope.master.remove().then(function() {
      $location.path('/server/' + $scope.server.name);
    });
  };

  $scope.save = function() {
    $scope.zone.masters = _.compact(_.map($scope.zone.masters_o, function(o) { return o['master']; } ));
    $scope.zone.nameservers = _.compact(_.map($scope.zone.nameservers_o, function(o) { return o['nameserver']; } ));
    $scope.zone.put().then(function() {
      $location.path('/server/' + $scope.server.name + '/zone/' + $scope.zone.id);
    });
  };

  $scope.addMaster = function() {
    $scope.zone.masters_o.push({'master': ''});
  };

  $scope.removeMaster = function(index) {
    $scope.zone.masters_o.splice(index, 1);
  };

  $scope.canAddMaster = function() {
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
}
