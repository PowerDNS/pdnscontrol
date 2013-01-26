window.App = Ember.Application.create({
  LOG_TRANSITIONS: true
});

App.ApplicationView = Ember.View.extend({
  templateName: 'application'
});
App.ApplicationController = Ember.Controller.extend();
