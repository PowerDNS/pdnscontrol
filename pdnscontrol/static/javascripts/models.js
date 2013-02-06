//// Models

App.Store = DS.Store.extend({
  revision: 11,
  adapter: DS.RESTAdapter.create({
    namespace: 'api'
  })
});

App.ServerStat = DS.Model.extend({
  primaryKey: 'name',
  name: DS.attr('name'),
  value: DS.attr('value')
});

App.ServerSetting = DS.Model.extend({
  primaryKey: 'name',
  name: DS.attr('name'),
  value: DS.attr('value')
});

App.Server = DS.Model.extend({
  primaryKey: 'name',
  name: DS.attr('string'),
  kind: DS.attr('string'),
  stats_url: DS.attr('string'),
  manager_url: DS.attr('string'),
  stats: DS.hasMany('App.ServerStat'),
  config_settings: DS.hasMany('App.ServerSetting'),

  // Computed Properties

  uptime: function() {
    var uptime = this.get('stats').findProperty('name', 'uptime');
    if (uptime === undefined) {
      return '';
    }
    return uptime.get('value');
  }.property('stats.@each'),

  listen_address: function() {
    // Can be simplified once sideloading is gone.
    return '' +
      (this.get('configuration.local-address')||'') +
      ' ' +
      (this.get('configuration.local-ipv6')||'');
  }.property('configuration.local-address', 'configuration.local-ipv6'),

  // Methods

  init: function() {
    this._super();
    this.on('didLoad', this.sideload_data);
  },

  sideload_data: function() {
    // Sideload data and stuff into 'configuration' and 'stats'.
    var that = this;
    var kind = this.get('kind');

    this.get('stats').isLoaded = false;
    this.get('config_settings').isLoaded = false;

    // FIXME: use ember to determine baseURL
    var baseURL = '/api/server/' + this.get('name') + '/';
    $.getJSON(baseURL + 'stats', function(data) {
      var stats = that.get('stats');
      for (var name in data) {
        stats.pushObject(App.ServerStat.createRecord({
          name: name,
          value: data[name]
        }));
      }

      if (kind === 'Authoritative') {
        that.set('version', data['version']);
      }
    });

    $.getJSON(baseURL + 'config', function(data) {
      var config_settings = that.get('config_settings');
      for (var name in data) {
        config_settings.pushObject(App.ServerSetting.createRecord({
          name: name,
          value: data[name]
        }));
      }

      if (kind === 'Recursor') {
        that.set('version', data["version-string"].split(" ")[2]);
      }
    });
  },

  flush_cache: function() {
    console.log('flushing cache of', this.get('name'));
  },

  search_log: function(search_text) {
    console.log('searching log of', this.get('name'), 'for', search_text);
  },

  restart: function() {
    console.log('restarting', this.get('name'));
  }

});
