var GraphiteModule = angular.module('graphite', []);
GraphiteModule.directive('graphite', function($timeout) {
  return {
    restrict: 'E',
    template: '<div class="graphite-graph"><div class="right graphite-times">' +
      '<a href="#" ng-click="set24h()" ng-class="{active: is24h}">24h</a> ' +
      '<a href="#" ng-click="set7d()" ng-class="{active: is7d}">7d</a> ' +
      '<a href="#" ng-click="set30d()" ng-class="{active: is30d}">30d</a> ' +
      '<a href="#" ng-click="set365d()" ng-class="{active: is365d}">365d</a> ' +
      '<a href="#" ng-click="setCustom()" ng-class="{active: isCustom}"><span ng-show="isCustom">{{from}}</span><span ng-show="!isCustom">...</span></a>' +
      '</div><br clear=all>' +
      '<img ng-src="{{url}}" class="graphite-graph"><div ng-transclude></div></div>',
    transclude: true,
    replace: true,
    scope: true,
    link: function(scope, elm, attrs, controller) {
      function updateUrl() {
        var invalid = false;

        var url = ServerData.Config.graphite_server + '?_salt=' + Math.random()*10000000;
        if (attrs.gSource === undefined)
          return;

        if (!attrs.gFrom) {
          attrs.$set('gFrom', '-24h');
        }

        var opts = _.defaults({
          'areaMode': attrs.gAreaMode || 'none',
          'from': attrs.gFrom,
          'title': attrs.gTitle || '',
        }, ServerData.Config.graphite_default_opts);

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

        scope.from = attrs.gFrom;
        scope.is24h  = (attrs.gFrom == '-24h');
        scope.is7d   = (attrs.gFrom == '-7d');
        scope.is30d  = (attrs.gFrom == '-30d');
        scope.is365d = (attrs.gFrom == '-365d');
        scope.isCustom = (!scope.is24h && !scope.is7d && !scope.is30d && !scope.is365d);
      }

      scope.set24h  = function() { attrs.$set('gFrom', '-24h');  };
      scope.set7d   = function() { attrs.$set('gFrom', '-7d');   };
      scope.set30d  = function() { attrs.$set('gFrom', '-30d');  };
      scope.set365d = function() { attrs.$set('gFrom', '-365d'); };
      scope.setCustom = function() {
        var time = prompt("Graphs should start at:\nNegative values for relative time, or absolute time.\nExamples: -24h, -7d, -1y, noon, monday, 20131231, 16:00_20131231", attrs.gFrom);
        if (time == null) {
          return;
        }
        if ((time.indexOf(':') == 1 && time.length == 4) || (time.indexOf(':') == 2 && time.length == 5)) {
          // stupid hack to workaround https://github.com/graphite-project/graphite-web/issues/616
          time = time + '_' + moment().format('YYYYMMDD');
        }
        attrs.$set('gFrom', time);
      };

      attrs.$observe('gSource', updateUrl);
      attrs.$observe('gAreaMode', updateUrl);
      attrs.$observe('gTitle', updateUrl);
      attrs.$observe('gFrom', updateUrl);
      scope.$on('graph_target_changed', updateUrl);
      if (attrs.gRefresh && attrs.gRefresh > 0) {
        function setupRefresh() {
          // if page visibility API is present, don't poll if page is in background
          if (typeof document.hidden !== "undefined" && document.hidden) {
            // register handler so we resume updating when we're becoming visible again.
            $(document).one('visibilitychange', function() {
              updateUrl();
              setupRefresh();
            });
            return;
          }
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
