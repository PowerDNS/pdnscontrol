"use strict";

////////////////////////////////////////////////////////////////////////
// Users
////////////////////////////////////////////////////////////////////////

angular.module('ControlApp.controllers.user', []);

angular.module('ControlApp.controllers.user').controller('UserListCtrl', ['$scope', 'Restangular', function($scope, Restangular) {
  Restangular.all("users").getList().then(function(users) {
    $scope.users = users;
  });

  $scope.orderProp = 'name';
  $scope.canEditUsers = (ServerData.User.roles.indexOf('edit-users') != -1);
}]);

angular.module('ControlApp.controllers.user').controller('UserCreateCtrl', ['$scope', '$location', 'Restangular', function($scope, $location, Restangular) {
  return UserEditCtrl($scope, $location, Restangular, Restangular.one('users'));
}]);

angular.module('ControlApp.controllers.user').controller('UserEditCtrl', ['$scope', '$location', 'Restangular', 'user', function($scope, $location, Restangular, user) {
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
