"use strict";

////////////////////////////////////////////////////////////////////////
// Base UI
////////////////////////////////////////////////////////////////////////

angular.module('ControlApp.controllers.ui', [
  'services.breadcrumbs',
  'services.httpRequestTracker'
]);

angular.module('ControlApp.controllers.ui').controller('NavCtrl', ['$scope', 'breadcrumbs', 'httpRequestTracker', function($scope, breadcrumbs, httpRequestTracker) {
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

angular.module('ControlApp.controllers.ui').controller('MainCtrl', ['$scope', '$document', '$location', function($scope, $document, $location) {
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

angular.module('ControlApp.controllers.ui').controller('GlobalSearchDataCtrl', ['$scope', '$location', 'Restangular', 'server', 'config', function($scope, $location, Restangular, server, config) {
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
