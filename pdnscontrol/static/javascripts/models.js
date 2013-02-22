/// REST API Interface

Control = Em.Namespace.create();

Control.IdentityMap = Em.Object.create();

Control.Model = Em.Object.extend(Ember.Evented, {
  _primaryKey: 'id',
  _lazyFind: true,
  isLoaded: false,

  reload: function() {
    var that = this;
    console.log('...reload', this);
    this.constructor.getJSON([this], function(data) {
      var prop;
      data = data[that._name];
      for (prop in data) {
        data.hasOwnProperty(prop) && that.set(prop, data[prop]);
      }
      that.set('isLoaded', true);
      console.log('reloaded:', that);
      that.trigger('didLoad');
    });
  },

  save: function() {

  }

});

Control.Model.reopenClass({
  getJSON: function(params, cb) {
    var url = this.urlFor(params);
    $.getJSON(url, cb);
  },

  save: function(obj) {
    var prop, payload, data, req_type, url;
    payload = {}
    for (prop in obj) {
      obj.hasOwnProperty(prop) && payload[prop] = obj[prop];
    }
    data = {}
    data[this._name] = payload;
    if (obj.isLoaded) {
      // update
      req_type = 'POST';
      url = obj._url;
    } else {
      // create
      req_type = 'PUT';
      url = obj._url.split('/');
      url = url.slice(0, url.length-1);
      url = '/'.join(url);
    }

    $.ajax(url, {
      dataType: json,
      data: JSON.stringify(data),
      contentType: "application/json; charset=UTF-8",
      type: req_type,
      success: function(data) {
        console.log('success', data);
      },
      error: function(data) {
        console.log('success', data);
      }
    });
  },

  createObject: function(finderParams, pkey_val, data) {
    var pkey = this.proto()._primaryKey,
      bare_data,
      prop,
      url,
      obj;

    if (!pkey_val && !data) {
      throw "Cant have no data and no pkey value";
    }
    if (!pkey_val) {
      pkey_val = data[pkey];
    }

    url = this.urlFor(finderParams.concat([this, pkey_val]));
    if (Control.IdentityMap[url] === undefined) {
      bare_data = {};
      bare_data._url = url;
      bare_data[pkey] = bare_data.id = pkey_val;
      Control.IdentityMap[url] = this.create(bare_data);
    }

    obj = Control.IdentityMap[url];
    if (data) {
      console.log(this, data);
      for (prop in data) {
        data.hasOwnProperty(prop) && obj.set(prop, data[prop]);
      }
      obj.set('isLoaded', true);
      obj.trigger('didLoad');
    }

    return obj;
  },

  findAll: function() {
    var that = this,
      object_list = Ember.ArrayProxy.create({content: []}),
      params = Array.prototype.slice.call(arguments);
    console.log('findAll', this);
    this.getJSON(params.concat([this]), function(data) {
      var obj, i;
      data = data[that.proto()._plural];
      for (i in data) {
        if (!data.hasOwnProperty(i)) {
          continue;
        }
        obj = that.createObject(params, null, data[i]);
        object_list.pushObject(obj);
      }
    });
    return object_list;
  },

  find: function(pkey_val) {
    var that = this,
      params = Array.prototype.slice.call(arguments, 1),
      obj = this.createObject(params, pkey_val);
    if (obj.get('isLoaded') == false || this._lazyFind == false) {
      // hit server only if we have to
      obj.reload();
    }
    return obj;
  },

  urlFor: function(params) {
    if (params.length == 1 && params[0]._url) {
      return params[0]._url;
    }

    var parts = ['/api'],
      objs = [],
      thing,
      url,
      i;
    for (i=0; i<params.length; i++) {
      thing = params[i];
      if (thing.proto && thing.proto()) {
        // class
        parts.push(thing.proto()._plural);
      } else if (thing.constructor && thing.constructor.proto) {
        // instance
        parts.push(thing.constructor.proto()._plural);
        parts.push(thing.get(thing.constructor.proto()._primaryKey));
      } else {
        // bare thing
        //parts.push(this.constructor.proto()._plural);
        parts.push(thing);
      }
    }
    url = parts.join('/');
    console.log(url);
    return url;
  }
});

//// Models

App.ServerStat = Control.Model.extend({
  _primaryKey: 'name',
  name: null,
  value: null
});

App.ServerSetting = Control.Model.extend({
  _primaryKey: 'name',
  name: null,
  value: null
});

App.RRSet = Control.Model.extend({
  _primaryKey: 'name_qtype',
  name_qtype: null,
  name: null,
  qtype: null,
  rrs: null
});

App.RR = Control.Model.extend({
  content: null,
  prio: null,
  ttl: null,
});

App.Zone = Control.Model.extend({
  _name: 'zone',
  _plural: 'zones',
  _primaryKey: 'name',
  _lazyFind: false,
  server: null,
  name: null,
  kind: null,
  rrsets: null,
  masters: null,
  serial: null,
  forwarders: null,
  rdbit: null
});


App.Server = Control.Model.extend({
  _name: 'server',
  _plural: 'servers',
  _primaryKey: 'name',
  name: '',
  kind: '',
  stats_url: '',
  manager_url: '',
  stats: null,
  config_settings: null,
  zones: null,
//  stats: DS.hasMany('App.ServerStat'),
//  config_settings: DS.hasMany('App.ServerSetting'),
//  zones: DS.hasMany('App.Zone'),

  // Computed Properties

  uptime: function() {
    var stats = this.get('stats'),
      uptime = stats && stats.findProperty('name', 'uptime');
    return (uptime && uptime.get('value') || '');
  }.property('stats.@each'), // FIXME: @each is a lie

  listen_address: function() {
    // Can be simplified once sideloading is gone.
    var config_settings = this.get('config_settings');
    if (!config_settings) {
      return '';
    }
    var local_address = config_settings.findProperty('name', 'local-address');
    var local_ipv6 = config_settings.findProperty('name', 'local-ipv6');
    return '' +
      (local_address && local_address.get('value') || '') +
      ' ' +
      (local_ipv6 && local_ipv6.get('value') || '');
  }.property('config_settings.@each'), // FIXME: @each is a lie

  graphite_name: function() {
    if (!this.get('name')) {
      return null;
    }

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
    this._super(arguments);
    this.on('didLoad', this.didLoad);
  },

  didLoad: function() {
    // Sideload data and stuff into 'configuration' and 'stats'.
    var that = this;
    var kind = this.get('kind');
    console.log('didLoad for', this.get('name'), this.get('kind'));


    this.set('stats', []);
    this.set('config_settings', []);

    //this.get('stats').isLoaded = false;
    //this.get('config_settings').isLoaded = false;

    this.constructor.getJSON([this, 'stats'], function(data) {
      var stats = that.get('stats');
      for (var name in data) {
        stats.pushObject(App.ServerStat.create({
          name: name,
          value: data[name]
        }));
      }

      if (kind === 'Authoritative') {
        that.set('version', data['version']);
      }
    });

    this.constructor.getJSON([this, 'config'], function(data) {
      var config_settings = that.get('config_settings');
      if (kind === 'Recursor') {
        for (var name in data) {
          if (data.hasOwnProperty(name)) {
            config_settings.pushObject(App.ServerSetting.create({
              name: name,
              value: data[name]
            }));
          }
        }
      } else {
        var i;
        for (i=0; i < data.config.length; i++) {
          config_settings.pushObject(App.ServerSetting.create({
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
        zone.id = zone.name;
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
