"use strict";

////////////////////////////////////////////////////////////////////////
// Me -- currently logged in user
////////////////////////////////////////////////////////////////////////

angular.module('ControlApp.controllers.me', []);

angular.module('ControlApp.controllers.me').controller('MeDetailCtrl', ['$scope', 'Restangular', 'me', function($scope, Restangular, me) {
  $scope.master = me;
  $scope.me = Restangular.copy($scope.master);
  $scope.errors = [];
}]);
