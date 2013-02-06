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

App.RRSet = DS.Model.extend({
  primaryKey: 'name_qtype',
  name_qtype: DS.attr('name_qtype'),
  name: DS.attr('name'),
  qtype: DS.attr('qtype'),
  rrs: DS.hasMany('App.RR')
});

App.RR = DS.Model.extend({
  content: DS.attr('content'),
  prio: DS.attr('prio'),
  ttl: DS.attr('ttl')
});

App.Zone = DS.Model.extend({
  primaryKey: 'name',
  name: DS.attr('name'),
  kind: DS.attr('kind'),
  rrsets: DS.hasMany('App.RRSet')
});

App.AuthZone = App.Zone.extend({
  masters: DS.attr('masters'),
  serial: DS.attr('serial')
});

App.RecursorZone = App.Zone.extend({
  forwarders: DS.attr('forwarders'),
  rdbit: DS.attr('rdbit')
});

App.Server = DS.Model.extend({
  primaryKey: 'name',
  name: DS.attr('string'),
  kind: DS.attr('string'),
  stats_url: DS.attr('string'),
  manager_url: DS.attr('string'),
  stats: DS.hasMany('App.ServerStat'),
  config_settings: DS.hasMany('App.ServerSetting'),
  zones: DS.hasMany('App.Zone'),

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

    var baseURL = this.store.adapter.buildURL(this.store.adapter.rootForType(this.constructor), this.get('id')) + '/';
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

  load_zones: function() {
    // Sideload zones.
    var that = this;

    var baseURL = this.store.adapter.buildURL(this.store.adapter.rootForType(this.constructor), this.get('id')) + '/';
    $.getJSON(baseURL + 'domains', function(data) {
      var zone_type = that.get('kind') === 'Authoritative' ? App.AuthZone : App.RecursorZone;

      var zones = that.get('zones');
      data["domains"].forEach(function(zone, key) {
        zone.kind = zone.type;
        zone.type = undefined;
        zones.pushObject(App.Zone.createRecord(zone));
      });
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
