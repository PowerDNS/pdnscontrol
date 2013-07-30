var GraphiteModule = angular.module('graphite', []);
GraphiteModule.directive('graphite', function() {
  return {
    restrict: 'E',
    template: '<div><img src="{{url}}"><div ng-transclude></div></div>',
    transclude: true,
    replace: true,
    scope: true,
    link: function(scope, elm, attrs, controller) {

      function updateUrl() {
        var invalid = false;

        var url = ServerData.Config.graphite_server + '?_salt=' + Math.random()*10000000;
        if (attrs.gSource === undefined)
          return;

        var opts = _.defaults({
          'title': attrs.gTitle,
          'areaMode': attrs.gAreaMode || 'none'
        }, ServerData.Config.graphite_default_opts);

        url = _.reduce(_.pairs(opts), function(memo, pair) {
          return memo + '&' + pair[0] + '=' + encodeURIComponent(pair[1]);
        }, url);

        url = _.reduce(elm.find('graph'), function(memo, graphEl) {
          graphEl = angular.element(graphEl);
          var target = graphEl.attr('target');
          if (target.indexOf("{{") == 0) {
            invalid = true;
            return;
          }
          target = target.replace(/%SOURCE%/g, attrs.gSource);
          if (graphEl.attr('title')) {
            target = 'alias(' + target + ', \'' + graphEl.attr('title') + '\')';
          }
          if (graphEl.attr('style') === 'cacti') {
            target = 'cactiStyle(' + target + ')';
          }

          return memo + '&target=' + encodeURIComponent(target);
        }, url);

        if (!invalid) {
          scope.url = url;
        }
      }

      attrs.$observe('gSource', updateUrl);
      attrs.$observe('gAreaMode', updateUrl);
      attrs.$observe('gTitle', updateUrl);
      scope.$on('graph_target_changed', function() {
        updateUrl();
      });
    }
  }
});
GraphiteModule.directive('graph', function() {
  return {
    restrict: 'E',
    link: function(scope, elm, attrs, controller) {
      attrs.$observe('target', function() {
        scope.$parent.$broadcast('graph_target_changed');
      });
    }
  }
});
