//// Router setup

App.Router.reopen({
  enableLogging: true,
  location: 'history'
});

App.Router.map(function() {
  this.resource('servers');
  this.resource('server', { path: '/server/:server_id' }, function() {
    this.route('edit');
    this.route('stats');
    this.route('domains');
    this.route('configuration');
  });

  this.route("favorites", { path: "/favs" });
});

//// Routes

App.IndexRoute = Ember.Route.extend({
  setupController: function(controller) {
    // Set the IndexController's `title`
    controller.set('title', "PowerDNS Console (index)");
  }
});

App.ServersRoute = Ember.Route.extend({
  model: function(params) {
    return App.Server.find();
  }
});

App.ServerConfigurationRoute = Ember.Route.extend({
  setupController: function(controller, model) {
    this._super(controller, model);
    controller.set('server', this.modelFor('server'));
  }
});

App.ServerStatsRoute = Ember.Route.extend({
  setupController: function(controller, model) {
    this._super(controller, model);
    controller.set('server', this.modelFor('server'));
  }
});

App.ServersController = Ember.ArrayController.extend({
  sortProperties: ['name'],

  allSelected: false,
  _allSelectedChanged: function() {
    this.get('content').setEach('isSelected', this.get('allSelected'));
  }.observes('allSelected'),

  selected_servers: function() {
    return this.get('content').
      filterProperty('isSelected', true);
  },

  flush_cache: function() {
    this.selected_servers().
      forEach(function(item) {
        item.flush_cache();
      });
  },

  search_log: function(search_text) {
    console.log(this.selected_servers());
    var messages = [];
    this.selected_servers().
      forEach(function(item) {
        // FIXME: very theoretical code
        messages += item.search_log(search_text);
      });
  },

  restart: function() {
    this.selected_servers().
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

        var record = App.Server.createRecord({
          name: this.name,
          stats_url: this.stats_url,
          manager_url: this.manager_url,
          kind: this.kind
        });

        record.on('didCreate', function() {
          that.close();
          // TODO: what now?
        });
        record.on('becameInvalid', function() {
          that.stopSpin();
          alert(this.errors);
        });

        record.store.commit();

        return false; // wait until completion
      }

    }).append();
  }

});


App.ServerController = Ember.ObjectController.extend({

  flush_cache: function() {
    this.get('content').flush_cache();
  },

  search_log: function(search_text) {
    this.get('content').search_log(search_text);
  },

  restart: function() {
    this.get('content').restart();
  },

});

App.ServerStatsController = Ember.ArrayController.extend({
});
