'use strict';

describe('controllers.zone', function() {
  describe('ZoneDetailCtrl', function() {
    var scope, server, zone, restangular;
    var makeController;

    beforeEach(module('ControlApp.controllers.zone'));
    beforeEach(inject(function ($rootScope, $controller) {
      scope = $rootScope.$new();
      server = {mustDo: function () {
        return true;
      }};
      zone = {rrsets: [], kind: 'NATIVE', name: 'example.org'};
      restangular = {copy: angular.copy};
      makeController = function() {
        return $controller('ZoneDetailCtrl', {$scope: scope, Restangular: restangular, server: server, zone: zone});
      };
    }));

    it('should not crash on load', function() {
      makeController();
    });

    it('should not support comments', function() {
      makeController();
      expect(scope.commentsSupported).toBe(false);
    });

    it('should support comments', function() {
      zone.comments = [];
      makeController();
      expect(scope.commentsSupported).toBe(true);
    });
  });
});
