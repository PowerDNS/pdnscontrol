'use strict';

describe('sorting', function() {
  describe('rrTypesSort', function() {
    it('it should sort SOA before NS', function() {
      var r = ['NS', 'SOA'].sort(rrTypesSort);
      expect(r).toEqual(['SOA', 'NS']);
    });

    it('it should sort NS before A', function() {
      var r = ['A', 'NS'].sort(rrTypesSort);
      expect(r).toEqual(['NS', 'A']);
    });

    it('it should sort in a stable way', function() {
      var input = _.pluck(rrTypes, 'name');
      var r1 = input.sort(rrTypesSort);
      var tmp = [].concat(r1);
      var r2 = tmp.sort(rrTypesSort);
      expect(r1).toEqual(r2);
    });
  });

  describe('dnsNameSort', function() {
    it('it should sort the apex before a record', function() {
      var r = ['record.example.org', 'example.org', 'record3.example.org'].sort(dnsNameSort);
      expect(r).toEqual(['example.org', 'record.example.org', 'record3.example.org']);
    });

    it('it should sort subentries after a record', function() {
      var r = ['record.example.org', 'example.org', 'foo.record.example.org', 'record2.example.org'].sort(dnsNameSort);
      expect(r).toEqual(['example.org', 'record.example.org', 'foo.record.example.org', 'record2.example.org']);
    });

    it('it should sort IPv6 zones correctly', function() {
      var r = [
        '3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa', '3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa',
        '1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.1.0.0.0.3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa',
        '1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.2.0.0.0.3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa',
        '0.4.7.b.e.0.e.f.f.f.b.b.6.2.2.0.2.0.0.0.3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa'
      ].sort(dnsNameSort);
      expect(r).toEqual([
        '3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa', '3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa',
        '1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.1.0.0.0.3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa',
        '1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.2.0.0.0.3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa',
        '0.4.7.b.e.0.e.f.f.f.b.b.6.2.2.0.2.0.0.0.3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa'
      ]);
    });

    it('it should sort in a stable way', function() {
      var input = ['record.example.org', 'example.org', 'record3.example.org', ''];
      var r1 = input.sort(dnsNameSort);
      var tmp = [].concat(r1);
      var r2 = tmp.sort(dnsNameSort);
      expect(r1).toEqual(r2);
    });
  });

  describe('zoneSort', function() {
    it('longer names should go after shorter names', function() {
      var input = [{"name":"3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa","type":"NS","ttl":3600,"priority":0,"disabled":false,"content":"ns1.namespace.at"},{"name":"3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa","type":"NS","ttl":3600,"priority":0,"disabled":false,"content":"ns2.namespace.at"},{"name":"3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa","type":"SOA","ttl":3600,"priority":0,"disabled":false,"content":"ns1.namespace.at. hostmaster.namespace.at. 1 10800 3600 604800 3600"},{"name":"1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.1.0.0.0.3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa","type":"PTR","ttl":3600,"priority":0,"disabled":false,"content":"slick.zeha.at"},{"name":"1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.2.0.0.0.3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa","type":"PTR","ttl":3600,"priority":0,"disabled":false,"content":"slick.home.zeha.at"},{"name":"0.4.7.b.e.0.e.f.f.f.b.b.6.2.2.0.2.0.0.0.3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa","type":"PTR","ttl":3600,"priority":0,"disabled":false,"content":"shiny.home.zeha.at"}];
      var r1 = zoneSort(input);
      expect(r1[0].name).toBe('3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa');
    });

    it('it should sort in a stable way', function() {
      var input = [{"name":"3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa","type":"NS","ttl":3600,"priority":0,"disabled":false,"content":"ns1.namespace.at"},{"name":"3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa","type":"NS","ttl":3600,"priority":0,"disabled":false,"content":"ns2.namespace.at"},{"name":"3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa","type":"SOA","ttl":3600,"priority":0,"disabled":false,"content":"ns1.namespace.at. hostmaster.namespace.at. 1 10800 3600 604800 3600"},{"name":"1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.1.0.0.0.3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa","type":"PTR","ttl":3600,"priority":0,"disabled":false,"content":"slick.zeha.at"},{"name":"1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.2.0.0.0.3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa","type":"PTR","ttl":3600,"priority":0,"disabled":false,"content":"slick.home.zeha.at"},{"name":"0.4.7.b.e.0.e.f.f.f.b.b.6.2.2.0.2.0.0.0.3.1.6.6.0.c.5.1.1.0.0.2.ip6.arpa","type":"PTR","ttl":3600,"priority":0,"disabled":false,"content":"shiny.home.zeha.at"}];
      var r1 = zoneSort(input);
      var tmp = [].concat(r1);
      var r2 = zoneSort(tmp);
      expect(r1).toEqual(r2);
    });
  })

});
