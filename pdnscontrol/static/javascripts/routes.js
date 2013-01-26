//// Router setup

App.Router.reopen({
  enableLogging: true,
  location: 'history'
});

App.Router.map(function() {
  this.resource('servers');

  this.resource('server', { path: '/server/:server_id' }, function() {
    this.route('edit');
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

App.ServerRoute = Ember.Route.extend({
});

App.ServersController = Ember.ArrayController.extend({
  sortProperties: ['name'],

  allSelected: false,
  _allSelectedChanged: function() {
    this.get('content').setEach('isSelected', this.get('allSelected'));
  }.observes('allSelected'),

  flush_cache: function() {
    var servers = this.get('content').
      filterProperty('isSelected', true).
      forEach(function(item) {
        item.flush_cache();
      });
  }
});
