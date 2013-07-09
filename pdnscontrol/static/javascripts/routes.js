/*
  authoritative_graph_urls: function() {
    var urls = [];
    var servers = this.get('selected_servers');

    if (servers.length == 0) {
      servers = this.get('content');
    }
    servers = servers.filterProperty('kind', 'Authoritative');
    if (servers.length == 0) {
      return false;
    }

    var answers = [];
    var queries = [];
    servers.forEach(function(e) {
      var source = e.get('graphite_name');
      answers.push('nonNegativeDerivative('+source+'.udp-answers)');
      queries.push('nonNegativeDerivative('+source+'.udp-queries)');
    });
    urls.addObject(App.Graphite.url_for('', [
      "alias(sumSeries(" + answers.join(',') + "), 'Answers')",
      "alias(sumSeries(" + queries.join(',') + "), 'Queries')",
    ], {areaMode: 'first'}));
    return urls;
  }

  recursor_graph_urls: function() {
    var urls = [];
    var servers = this.get('selected_servers');

    if (servers.length == 0) {
      servers = this.get('content');
    }
    servers = servers.filterProperty('kind', 'Recursor');
    if (servers.length == 0) {
      return false;
    }

    var answers_each = ['answers0-1', 'answers1-10', 'answers10-100', 'answers100-1000', 'answers-slow', 'packetcache-hits'];
    answers_each.forEach(function(el,idx,ary) {
      ary[idx] = 'nonNegativeDerivative(%SOURCE%.' + el + ')';
    });
    answers_each = answers_each.join(',');
    var answers = [];
    var queries = [];
    servers.forEach(function(e) {
      var source = e.get('graphite_name');
      answers.push('sumSeries(' + answers_each.replace(/%SOURCE%/g, source) + ')');
      queries.push('nonNegativeDerivative('+source+'.questions)');
    });
    urls.addObject(App.Graphite.url_for('', [
      "alias(sumSeries(" + answers.join(',') + "), 'Answers')",
      "alias(sumSeries(" + queries.join(',') + "), 'Queries')",
    ], {areaMode: 'first'}));
    return urls;
  }

  index_graph_urls: function() {
    var name = this.get('graphite_name');
    if (!name) {
      return [];
    }
    var urls = [];
    var answers;
    if (this.get('kind') == 'Authoritative') {
      urls.addObject(App.Graphite.url_for(name, [
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.udp-answers), 'UDP answers'))",
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.udp-queries), 'UDP queries'))",
      ], {areaMode: 'first', title: 'UDP Queries'}));
      urls.addObject(App.Graphite.url_for(name, [
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.tcp-answers), 'TCP answers'))",
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.tcp-queries), 'TCP queries'))",
      ], {areaMode: 'first', title: 'TCP Queries'}));
      urls.addObject(App.Graphite.url_for(name, [
        "cactiStyle(alias(%SOURCE%.latency, 'latency'))",
      ], {title: 'Latency'}));
      urls.addObject(App.Graphite.url_for(name, [
        "cactiStyle(alias(%SOURCE%.qsize-q, 'queue size'))",
      ], {title: 'Database queue'}));
      urls.addObject(App.Graphite.url_for(name, [
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.corrupt-packets), 'corrupt packets'))",
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.servfail-packets), 'servfail packets'))",
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.timedout-packets), 'timed out packets'))",
      ], {title: 'Errors'}));
    } else {
      answers = ['answers0-1', 'answers1-10', 'answers10-100', 'answers100-1000', 'answers-slow', 'packetcache-hits'];
      answers.forEach(function(el,idx,ary) {
        ary[idx] = 'nonNegativeDerivative(%SOURCE%.' + el + ')';
      });
      answers = answers.join(',');
      urls.addObject(App.Graphite.url_for(name, [
        "alias(nonNegativeDerivative(%SOURCE%.questions), 'Questions')",
        "alias(sumSeries("+answers+"), 'Answers')",
      ], {areaMode: 'first', title: 'Queries'}));
      urls.addObject(App.Graphite.url_for(name, [
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.answers0-1), 'in 1ms'))",
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.answers1-10), 'in 10ms'))",
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.answers10-100), 'in 100ms'))",
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.answers100-1000), 'in 1s'))",
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.answers-slow), 'over 1s'))",
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.outgoing-timeouts), 'timeouts'))",
      ], {areaMode: 'stacked', title: 'Latency distribution'}));
      urls.addObject(App.Graphite.url_for(name, [
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.cache-hits), 'cache hits'))",
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.cache-misses), 'cache misses'))",
      ], {title: 'Cache'}));
      urls.addObject(App.Graphite.url_for(name, [
        "cactiStyle(alias(%SOURCE%.cache-entries, 'entries'))",
        "cactiStyle(alias(%SOURCE%.negcache-entries, 'negative entries'))",
      ], {areaMode: 'stacked', title: 'Cache size'}));
      urls.addObject(App.Graphite.url_for(name, [
        "cactiStyle(alias(%SOURCE%.concurrent-queries, 'queries'))",
      ], {areaMode: 'stacked', title: 'Concurrent queries'}));
      urls.addObject(App.Graphite.url_for(name, [
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.spoof-prevents), 'spoofs'))",
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.resource-limits), 'resources'))",
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.client-parse-errors), 'client'))",
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.server-parse-errors), 'server'))",
        "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.tcp-client-overflow), 'tcp concurrency'))",
      ], {title: 'Exceptions'}));

    }

*/
