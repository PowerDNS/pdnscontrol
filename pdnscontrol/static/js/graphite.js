"use strict";

var GraphiteModule = angular.module('graphite', []);
GraphiteModule.directive('graphite', function($interval) {
  return {
    restrict: 'E',
    template: '<div class="graphite-graph"><div class="right graphite-times">' +
      '<span class="changeInProgress graphite-graph-loading" ng-hide="isComplete()">&#8734;</span>' +
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
    link: function(scope, elm, attrs) {
      attrs.$set('gSalt', Math.random()*10000000);

      function updateUrl() {
        var url = ServerData.Config.graphite_server + '?_cache=180&_salt=' + attrs.gSalt;
        if (attrs.gSource === undefined)
          return;

        if (!attrs.gFrom) {
          attrs.$set('gFrom', '-24h');
        }

        var opts = _.defaults({
          'areaMode': attrs.gAreaMode || 'none',
          'from': attrs.gFrom,
          'title': attrs.gTitle || '',
          'vtitle': attrs.gVTitle || ''
        }, ServerData.Config.graphite_default_opts);

        // automatically choose width, if possible
        var width = $(elm).width() || $(elm).parent().width();
        if (width > 0) {
          opts['width'] = width;
        }

        url = _.reduce(_.pairs(opts), function(memo, pair) {
          return memo + '&' + pair[0] + '=' + encodeURIComponent(pair[1]);
        }, url);

        var have_targets = false;
        url = _.reduce(elm.find('graph'), function(memo, graphEl) {
          graphEl = angular.element(graphEl);
          var target = graphEl.attr('target');
          if (!target || target.indexOf("{{") == 0) {
            return memo;
          }
          have_targets = true;

          target = target.replace(/%SOURCE%/g, attrs.gSource);
          if (attrs.gBase == 'time') {
            target = 'scaleToSeconds(' + target + ', 1)';
          }
          if (graphEl.attr('title')) {
            target = 'alias(' + target + ', \'' + graphEl.attr('title') + '\')';
          }
          if (graphEl.attr('style') === 'cacti') {
            target = 'cactiStyle(' + target + ')';
          }

          return memo + '&target=' + encodeURIComponent(target);
        }, url);

        if (have_targets) {
          scope.url = url;
        } else {
          scope.url = '';
        }

        scope.from = attrs.gFrom;
        scope.is24h  = (attrs.gFrom == '-24h');
        scope.is7d   = (attrs.gFrom == '-7d');
        scope.is30d  = (attrs.gFrom == '-30d');
        scope.is365d = (attrs.gFrom == '-365d');
        scope.isCustom = (!scope.is24h && !scope.is7d && !scope.is30d && !scope.is365d);
      }

      scope.isComplete = function() {
        return elm.find('img')[0].complete;
      };
      elm.find('img').bind('load', function() {
        // update isComplete.
        scope.$digest();
      });

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
      attrs.$observe('gVTitle', updateUrl);
      attrs.$observe('gFrom', updateUrl);
      scope.$on('graph_target_changed', updateUrl);

      function beginRefresh() {
        attrs.$set('gSalt', Math.random()*10000000);
        // if page visibility API is present, don't poll if page is in background
        if (typeof document.hidden !== "undefined" && document.hidden) {
          // register handler so we resume updating when we're becoming visible again.
          $(document).one('visibilitychange', function() {
              updateUrl();
              beginRefresh();
          });
          return;
        }
        // release when the element is no longer attached to the current DOM
        if (!jQuery.contains(document, elm[0])) {
          return;
        }
        $interval(function() {
          // refresh graphs
          beginRefresh();
          updateUrl();
        }, attrs.gRefresh*1000, 1);
      }

      if (attrs.gRefresh && attrs.gRefresh > 0) {
        beginRefresh();
      }
    }
  };
});

GraphiteModule.directive('graph', function() {
  return {
    restrict: 'E',
    link: function(scope, elm, attrs, controller) {
      attrs.$observe('target', function() {
        scope.$parent.$broadcast('graph_target_changed');
      });
    }
  };
});

GraphiteModule.directive('sparklegraph', function($http, $interval) {
  function showGraph(server, metric, width, from, elm, doneCallback) {
    $http.get(ServerData.Config.graphite_server, {
      params: {
        format: 'json',
        areaMode: 'first',
        from: from,
        target: 'nonNegativeDerivative(pdns.' + server + '.' + metric + ')'
      }
    }).success(function(data) {
      if (data.length > 0) {
        var points = data[0].datapoints;
        var flat = [];
        $.each(points, function(key, value) {
          flat.push(1.0*value[0]);
        });
        $(elm).sparkline(flat, {
          width: width,
          disableTooltips: true
        });
      }
      doneCallback();
    });
  }

  return {
    restrict: 'E',
    link: function(scope, elm, attrs) {
      var server = attrs.server.replace(/\./gm,'-');
      var metric = attrs.metric;
      var width = attrs.width;
      var from = attrs.from || '-300s';
      function update() {
        // release when the element is no longer attached to the current DOM
        if (!jQuery.contains(document, elm[0])) {
          return;
        }

        showGraph(server, metric, width, from, elm, function() {
          // schedule update in 5sec
          $interval(update, 5*1000, 1);
        });
      }
      update();
    }
  };
});
