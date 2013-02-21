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
    return (uptime && uptime.get('value') || '');
  }.property('stats.@each'), // FIXME: @each is a lie

  listen_address: function() {
    // Can be simplified once sideloading is gone.
    var config_settings = this.get('config_settings');
    var local_address = config_settings.findProperty('name', 'local-address');
    var local_ipv6 = config_settings.findProperty('name', 'local-ipv6');
    return '' +
      (local_address && local_address.get('value') || '') +
      ' ' +
      (local_ipv6 && local_ipv6.get('value') || '');
  }.property('config_settings.@each'), // FIXME: @each is a lie

  graphite_name: function() {
    var name = 'pdns.'+this.get('name').replace(/\./gm,'-');
    if (this.get('kind') == 'Authoritative') {
      name = name + '.auth';
    } else {
      name = name + '.recursor';
    }
    return name;
  }.property('kind', 'name'),

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
      if (kind === 'Recursor') {
        for (var name in data) {
          config_settings.pushObject(App.ServerSetting.createRecord({
            name: name,
            value: data[name]
          }));
        }
      } else {
        var i;
        for (i=0; i < data.config.length; i++) {
          config_settings.pushObject(App.ServerSetting.createRecord({
            name: data.config[i][0],
            value: data.config[i][1]
          }));
        }
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

  search_log: function(search_text, logdata) {
    var baseURL = this.store.adapter.buildURL(this.store.adapter.rootForType(this.constructor), this.get('id')) + '/';
    logdata = logdata || [];
    $.getJSON(baseURL + 'log-grep?needle=' + search_text, function(data) {
      data.content.forEach(function(el,idx) {
        logdata.pushObject(el);
      });
    });
    return logdata;
  },

  restart: function() {
    console.log('restarting', this.get('name'));
  }

});

App.Graphite = Em.Object.extend({});
App.Graphite.url_for = function(source, targets, opts) {
//  console.log(
  var url = ServerData.Config.graphite_server + '?_salt=' + Math.random()*10000000;
  opts = _.defaults(opts || {}, ServerData.Config.graphite_default_opts);

  url = _.reduce(_.pairs(opts), function(memo, pair) {
    return memo + '&' + pair[0] + '=' + encodeURIComponent(pair[1]);
  }, url);

  url = _.reduce(targets, function(memo, target) {
    return memo + '&target=' + encodeURIComponent(target.replace(/%SOURCE%/g, source));
  }, url);

  return url;
};
