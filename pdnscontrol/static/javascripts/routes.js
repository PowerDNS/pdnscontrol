//// Router setup

App.Router.reopen({
  enableLogging: true,
  location: 'history'
});

App.Router.map(function() {
  this.resource('servers', function() {
    this.resource('server', { path: ':server_id' }, function() {
      this.route('edit'); // TODO
      this.route('stats');
      this.resource('zones', function () {
        this.route('zone', { path: ':zone_id' });
      });
      this.route('configuration');
      this.route('restart');
      this.route('flush_cache');
      this.route('shutdown');
      this.route('deploy');
    });
  });
});

//// Routes

var approute;
App.ApplicationRoute = Ember.Route.extend({
  setupController: function(controller, model) {
    approute = this;
  }
});

App.IndexRoute = Ember.Route.extend({
  redirect: function() {
    this.transitionTo('servers');
  }
});

App.ServersRoute = Ember.Route.extend({
  model: function(params) {
    return App.Server.findAll();
  }
});

App.ServersController = Ember.ArrayController.extend({});

App.ServersIndexRoute = Ember.Route.extend({
  model: function(params) {
    return this.modelFor('servers');
  }
});

// shadow of ServerRoute
App.ServerIndexRoute = Ember.Route.extend({
  model: function(params) {
    return this.modelFor('server');
  }
});

App.ServerConfigurationRoute = Ember.Route.extend({
  model: function(params) {
    return this.modelFor('server').get('config_settings');
  },
  setupController: function(controller, model) {
    this._super(controller, model);
    controller.set('server', this.modelFor('server'));
  }
});

App.ZonesIndexRoute = Ember.Route.extend({
  model: function(params) {
    var server = this.modelFor('server');
    console.log('ZonesIndexRoute', server);
    return App.Zone.findAll(server);
  },
  setupController: function(controller, model) {
    this._super(controller, model);
    controller.set('server', this.modelFor('server'));
  }
});

App.ZonesZoneRoute = Ember.Route.extend({
  model: function(params) {
    var server = this.modelFor('server'),
      model = App.Zone.find(params.zone_id, server);
    model.load_rrsets();
    return model;
  },
  setupController: function(controller, model) {
    this._super(controller, model);
    controller.set('server', this.modelFor('server'));
  }
});

App.ServerStatsRoute = Ember.Route.extend({
  model: function(params) {
    return this.modelFor('server').get('stats');
  },
  setupController: function(controller, model) {
    this._super(controller, model);
    controller.set('server', this.modelFor('server'));
  }
});

App.ServersIndexController = Ember.ArrayController.extend({
  sortProperties: ['name'],
  needs: ['servers'],

  allSelected: false,
  _allSelectedChanged: function() {
    this.get('content').setEach('isSelected', this.get('allSelected'));
  }.observes('allSelected'),

  selected_servers: function() {
    return this.get('content').filterProperty('isSelected', true);
  }.property('content.@each.isSelected'),

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
  }.property('selected_servers'),

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
  }.property('selected_servers'),

  flush_cache: function() {
    console.log('servers', this.get('selected_servers'));
    this.get('selected_servers').
      forEach(function(item) {
        item.flush_cache();
      });
  },

  search_log: function(search_text) {
    console.log(this.get('selected_servers'));
    var messages = [];
    this.get('selected_servers').
      forEach(function(item) {
        // FIXME: very theoretical code
        messages += item.search_log(search_text);
      });

    var c = this.controllerFor('search_log');
    c.set('content', messages);
    c.set('search_text', search_text);
    c.show();
  },

  restart: function() {
    this.get('selected_servers').
      forEach(function(item) {
        item.restart();
      });
  },

  new: function() {
    // add new server to Console database
    App.ModalView.create({
      templateName: 'servers/_new',
      controller: this,
      title: 'Add Server',
      success: 'Save',

      name: null,
      kind: null,
      stats_url: null,
      manager_url: null,

      openCallback: function() {
        this.$('.name').focus();
      },

      closeCallback: function() {
        console.log(this);
        return true;
      },

      successCallback: function() {
        var that = this;

        // Ember doesn't have a RadioButtonGroupView at this point, so
        // let's take the foot path.
        this.kind = this.$('input[name=kind]')[0].checked ? 'Authoritative' : 'Recursor';
        this.spin();

        var record = App.Server.create({
          name: this.name,
          stats_url: this.stats_url,
          manager_url: this.manager_url,
          kind: this.kind
        });

        record.on('didCreate', function() {
          that.close();
          that.controller.pushObject(record);
        });
        record.on('becameInvalid', function() {
          that.stopSpin();
          alert(this.errors);
        });

        record.save();

        return false; // wait until completion
      }

    }).append();
  }

});

App.SearchLogController = Ember.Table.TableController.extend({
  hasHeader: true,
  hasFooter: false,
  numFixedColumns: 0,

  columns: function() {
    return [
      Ember.Table.ColumnDefinition.create({
        headerCellName: 'Log Entry',
        columnWidth: 1000,
        getCellContent: function(row) { return row; },
      })
    ];
  }.property(),

  show: function() {
    $('#search_log_modal').reveal({
      open: function() {
        // hack to trigger ember-table sizing calculation
        $(window).trigger('resize');
      }
    });
  },
});

App.ServerActionController = Ember.ObjectController.extend({
  started: false,
  progress: null,
  title: '',
  action: '',
  layoutName: null,
  modalView: null,

  progress_text: function() {
    var state = this.get('progress.state');
    var texts = {'success': 'Success', 'error': 'Failed'};
    var text = texts[state];
    if (text) {
      return text;
    }
    return state;
  }.property('progress.state'),

  show: function() {
    var controller = this;
    // reset self
    this.set('started', false);
    this.set('progress', null);

    var modalview = App.ModalView.create({
      templateName: 'server/action',
      controller: controller,
      title: controller.get('title'),
      success: controller.get('title'),
      successCallback: function() {
        if (controller.get('started')) {
          return true;
        }
        this.spin();
        controller.dispatch();
        return false; // wait for completion
      }
    });
    this.set('modalView', modalview);
    modalview.append();
  },

  progressChanged: function() {
    var state = this.get('progress.state');
    console.log('progress.state observer, state=', state);
    if (state == 'success' || state == 'error') {
      this.get('modalView').stopSpin();
      this.get('modalView').set('success', 'Close');
    }
  },

  dispatch: function() {
    var that = this,
      server = this.get('content');
    this.set('started', true);
    this.addObserver('progress.state', function() {
      that.progressChanged();
    });
    this.set('progress', this.trigger_action(server));
  },

  /* Override this one if you don't want the default behavior. */
  trigger_action: function(server) {
    var action = this.get('action');
    return server[action]();
  }
});

App.ServerRestartController = App.ServerActionController.extend({
  action: 'restart',
  title: 'Restart',
  layoutName: 'server/_restart'
});

App.ServerShutdownController = App.ServerActionController.extend({
  action: 'shutdown',
  title: 'Shutdown',
  layoutName: 'server/_shutdown'
});

App.ServerDeployController = Ember.ObjectController.extend({
  show: function() {
    // this is even more fake
    alert('This server is up to date.');
  }
});

App.ServerFlushCacheController = App.ServerActionController.extend({
  action: 'flush_cache',
  title: 'Flush Cache',
  layoutName: 'server/_flush_cache',
  domain: '',
  trigger_action: function(server) {
    var domain = this.get('domain');
    return server.flush_cache(domain);
  }
});

App.ServerController = Ember.ObjectController.extend({
  needs: ['ServerDeploy', 'ServerFlushCache', 'ServerRestart', 'search_log', 'ServerShutdown'],

  deploy: function() {
    var c = this.get('controllers.ServerDeploy');
    c.set('content', this.get('content'));
    c.show();
  },

  flush_cache: function() {
    var c = this.get('controllers.ServerFlushCache');
    c.set('content', this.get('content'));
    c.show();
  },

  restart: function() {
    var c = this.get('controllers.ServerRestart');
    c.set('content', this.get('content'));
    c.show();
  },

  search_log: function(search_text) {
    var c = this.controllerFor('search_log');
    c.set('content', this.get('content').search_log(search_text));
    c.set('search_text', search_text);
    c.show();
  },

  shutdown: function() {
    var c = this.get('controllers.ServerShutdown');
    c.set('content', this.get('content'));
    c.show();
  }

});

App.ServerIndexController = Ember.ObjectController.extend({
  graph_urls: function() {
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
    return urls;
  }.property('kind', 'graphite_name')

});

App.SortedTableController = Ember.Table.TableController.extend({
  sortColumn: null,
  sortAscending: null,

  sortByColumn: function(column) {
    if (column.get('sortAscending') === undefined ||
        column == this.get('sortColumn')) {
      column.toggleProperty('sortAscending');
    }
    var sortAscending = column.get('sortAscending');
    this.get('columns').setEach('isSortedBy', false);
    column.set('isSortedBy', true);

    this.set('sortColumn', column);
    this.set('sortAscending', sortAscending);

    var content = this.get('content').slice();
    var sorted = content.sort(function(item1, item2) {
      var result = Ember.compare(
        column.getCellContent(item1),
        column.getCellContent(item2)
      );
      return sortAscending ? result : -result;
    });
    this.set('content', Ember.A(sorted));
  }
});

App.SortedTableColumnDefinition = Ember.Table.ColumnDefinition.extend({
  headerCellViewClass: 'App.TableHeaderCellView'
});

App.ServerConfigurationController = App.SortedTableController.extend({
  hasHeader: true,
  hasFooter: false,
  rowHeight: 30,
  numFixedColumns: 0,

  columns: function() {
    return [
      App.SortedTableColumnDefinition.create({
        headerCellName: 'Name',
        columnWidth: 250,
        getCellContent: function(row) { return row.get('name'); },
      }),
      App.SortedTableColumnDefinition.create({
        headerCellName: 'Value',
        columnWidth: 600,
        getCellContent: function(row) { return row.get('value'); },
      })
    ];
  }.property(),

});

App.ZonesController = Ember.ArrayController.extend({});

App.ZonesIndexController = App.SortedTableController.extend({
  hasHeader: true,
  hasFooter: false,
  rowHeight: 30,
  numFixedColumns: 0,

  zones_editable: function() {
    return this.get('server.kind') === 'Authoritative';
  }.property('server.kind'),

  columns: function() {
    if (this.get('server') === undefined) {
      // While initializing we don't have a server yet.
      return [];
    }

    var cols = [
      Ember.Table.ColumnDefinition.create({
        headerCellName: 'Name',
        columnWidth: 300,
        getCellContent: function(row) { return row.get('name'); },
        tableCellViewClass: 'App.ZonesIndexZoneLinkTableCellView',
        headerCellViewClass: 'App.TableHeaderCellView'
      }),
      Ember.Table.ColumnDefinition.create({
        headerCellName: 'Kind',
        columnWidth: 100,
        getCellContent: function(row) { return row.get('kind'); },
        headerCellViewClass: 'App.TableHeaderCellView'
      })
    ];

    if (this.get('server').get('kind') === 'Authoritative') {
      cols.addObject(Ember.Table.ColumnDefinition.create({
        headerCellName: 'Masters',
        columnWidth: 200,
        getCellContent: function(row) { return row.get('masters'); },
        headerCellViewClass: 'App.TableHeaderCellView'
      }));
      cols.addObject(Ember.Table.ColumnDefinition.create({
        headerCellName: 'serial',
        columnWidth: 100,
        getCellContent: function(row) { return row.get('serial'); },
        headerCellViewClass: 'App.TableHeaderCellView'
      }));
    } else {
      cols.addObject(Ember.Table.ColumnDefinition.create({
        headerCellName: 'Forwarders',
        columnWidth: 200,
        getCellContent: function(row) { return row.get('forwarders'); },
        headerCellViewClass: 'App.TableHeaderCellView'
      }));
      cols.addObject(Ember.Table.ColumnDefinition.create({
        headerCellName: 'Recursion Desired',
        columnWidth: 200,
        getCellContent: function(row) { return row.get('rdbit') == 0 ? 'No' : 'Yes'; },
        headerCellViewClass: 'App.TableHeaderCellView'
      }));
    }
    return cols;
  }.property('server'),

});

App.ServerStatsController = App.SortedTableController.extend({
  hasHeader: true,
  hasFooter: false,
  rowHeight: 30,
  numFixedColumns: 0,

  columns: function() {
    return [
      Ember.Table.ColumnDefinition.create({
        headerCellName: 'Name',
        columnWidth: 250,
        getCellContent: function(row) { return row.get('name'); },
        headerCellViewClass: 'App.TableHeaderCellView'
      }),
      Ember.Table.ColumnDefinition.create({
        headerCellName: 'Value',
        columnWidth: 600,
        getCellContent: function(row) { return row.get('value'); },
        headerCellViewClass: 'App.TableHeaderCellView'
      })
    ];
  }.property(),

});
