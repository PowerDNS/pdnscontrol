angular.module('components', []).
  directive('tabs', function() {
    return {
      restrict: 'E', // must be an 'E'lement
      transclude: true,
      scope: {}, // a scope for us to use
      controller: function($scope, $element) {
        var panes = $scope.panes = [];
 
        $scope.select = function(pane) {
          angular.forEach(panes, function(pane) {
            pane.selected = false;
          });
          pane.selected = true;
        }
 
        this.addPane = function(pane) {
          if (panes.length == 0) $scope.select(pane);
          panes.push(pane);
        }
      },
      template:
        '<div>' + 
        '<dl class="tabs">' +
          '<dd ng-repeat="pane in panes" ng-class="{active:pane.selected}">'+
            '<a href="#" ng-click="select(pane)">{{pane.tabtitle}}</a>' +
            '</dd>' +
        '</dl>' +
        '<dl class="tab-content" ng-transclude></dl>' +
        '</div>',
      replace: true
    };
  }).
  directive('pane', function() {
    return {
      require: '^tabs',
      restrict: 'E',
      transclude: true,
      scope: { tabtitle: '@' },
      link: function(scope, element, attrs, tabsCtrl) {
        tabsCtrl.addPane(scope);
      },
      template:
        '<dd ng-class="{active:selected,hidden:!selected}" ng-transclude>' +
        '</dd>',
      replace: true
    };
  });
