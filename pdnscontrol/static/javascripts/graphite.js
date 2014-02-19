var GraphiteModule = angular.module('graphite', []);
GraphiteModule.directive('graphite', function($timeout) {
  return {
    restrict: 'E',
    template: '<div><img ng-src="{{url}}" class="graphite-graph"><div ng-transclude></div></div>',
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
          'areaMode': attrs.gAreaMode || 'none'
        }, ServerData.Config.graphite_default_opts);

        // optional title
        if (attrs.gTitle) {
          opts.title = attrs.gTitle;
        }

        // automatically choose width, if possible
        var width = parseInt($(elm).parent().width());
        if (width > 0) {
          opts['width'] = width;
        }

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
      if (attrs.gRefresh && attrs.gRefresh > 0) {
        function setupRefresh() {
          $timeout(function() {
            // refresh graphs
            setupRefresh();
            updateUrl();
          }, attrs.gRefresh*1000);
        }
        setupRefresh();
      }
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
