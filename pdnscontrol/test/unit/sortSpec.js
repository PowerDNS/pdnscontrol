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

    it('it should sort in a stable way', function() {
      var input = ['record.example.org', 'example.org', 'record3.example.org', ''];
      var r1 = input.sort(dnsNameSort);
      var tmp = [].concat(r1);
      var r2 = tmp.sort(dnsNameSort);
      expect(r1).toEqual(r2);
    });
  });
});
