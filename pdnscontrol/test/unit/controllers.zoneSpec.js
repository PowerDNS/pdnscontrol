'use strict';

describe('controllers.zone', function() {
  describe('ZoneDetailCtrl', function() {
    var scope, server, zone, restangular;

    beforeEach(module('ControlApp.controllers.zone'));
    beforeEach(inject(function ($rootScope) {
      scope = $rootScope.$new();
      server = {mustDo: function (a) {
        return true;
      }};
      zone = {records: [], kind: 'NATIVE', name: 'example.org'};
      restangular = {copy: angular.copy};
    }));

    it('should not crash on load', inject(function($controller) {
      $controller('ZoneDetailCtrl', {$scope: scope, Restangular: restangular, server: server, zone: zone});
    }));

    it('should not support comments', inject(function($controller) {
      var ctrl = $controller('ZoneDetailCtrl', {$scope: scope, Restangular: restangular, server: server, zone: zone});
      expect(scope.commentsSupported).toBe(false);
    }));

    it('should support comments', inject(function($controller) {
      zone.comments = [];
      var ctrl = $controller('ZoneDetailCtrl', {$scope: scope, Restangular: restangular, server: server, zone: zone});
      expect(scope.commentsSupported).toBe(true);
    }));
  });
});
