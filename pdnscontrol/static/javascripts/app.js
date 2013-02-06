window.App = Ember.Application.create({
  LOG_TRANSITIONS: true
});

App.ApplicationView = Ember.View.extend({
  templateName: 'application'
});

App.ApplicationController = Ember.Controller.extend({
  init: function() {
    this._super();
    this.set('current_user', Ember.Object.create(ServerData.User));
    this.set('app_config', Ember.Object.create(ServerData.Config));
  }
});
