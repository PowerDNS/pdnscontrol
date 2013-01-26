//// Models

App.Store = DS.Store.extend({
  revision: 11,
  adapter: DS.RESTAdapter.create({
    namespace: 'api'
  })
});

App.Server = DS.Model.extend({
  primaryKey: 'name',
  name: DS.attr('string'),
  kind: DS.attr('string'),
  flush_cache: function() {
    console.log('flushing cache of ', this, this.get('name'));
  }
});
