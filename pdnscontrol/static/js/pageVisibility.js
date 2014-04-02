"use strict";

angular.module('services.pageVisibility', []);
angular.module('services.pageVisibility').factory('pageVisibility', ['$rootScope', function($rootScope) {

  var pageVisibilityHandler = {};
  pageVisibilityHandler.register = function () {
    return true;
  };

  if (typeof document.hidden !== "undefined") {
    $(document).on('visibilitychange', function () {
      $rootScope.$apply(function() {
        $rootScope.$broadcast('pageVisibilityChanged', document.hidden);
      });
    });
  }

  return pageVisibilityHandler;
}]);
