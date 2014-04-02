'use strict';

describe('zone utilities', function() {

  beforeEach(function(){
    this.addMatchers({
      toEqualData: function(expected) {
        return angular.equals(this.actual, expected);
      }
    });
  });

  describe('diffRRsets', function(){
    var zoneMaster, zoneCurrent;
    var sampleZone = angular.copy({
      "rrsets": [
        {
          "name": "example.net",
          "type": "SOA",
          "records": [
            {
              "name": "example.net",
              "type": "SOA",
              "ttl": 3600,
              "priority": 0,
              "disabled": false,
              "content": "ns1.example.org"
            }
          ],
          "comments": []
        },
        {
          "name": "example.net",
          "type": "NS",
          "records": [
            {
              "name": "example.net",
              "type": "NS",
              "ttl": 3600,
              "priority": 0,
              "disabled": false,
              "content": "ns1.example.org"
            },
            {
              "name": "example.net",
              "type": "NS",
              "ttl": 3600,
              "priority": 0,
              "disabled": false,
              "content": "ns2.example.org"
            }
          ],
          "comments": [
            {
              "name": "example.net",
              "type": "NS",
              "modified_at": 1396274220,
              "account": "admin@example.org",
              "content": "a test comment"
            }
          ]
        }
      ]
    });

    beforeEach(module('control'));

    it('it should find no changes for no changes', function() {
      zoneMaster = angular.copy(sampleZone);
      zoneCurrent = angular.copy(zoneMaster);
      var changes = diffRRsets(zoneMaster.rrsets, zoneCurrent.rrsets);
      expect(changes).toEqual([]);
    });

    it('it should work with empty zones', function() {
      zoneMaster = {rrsets: []};
      zoneCurrent = angular.copy(zoneMaster);
      var changes = diffRRsets(zoneMaster.rrsets, zoneCurrent.rrsets);
      expect(changes).toEqual([]);
    });

    it('it should find new rrsets', function() {
      zoneMaster = {rrsets: []};
      zoneCurrent = angular.copy(zoneMaster);
      zoneCurrent.rrsets[0] = {
        name: 'example.org',
        type: 'A',
        records: [{
          content: '1.2.3.4'
        }],
        comments: []
      };
      var changes = diffRRsets(zoneMaster.rrsets, zoneCurrent.rrsets);
      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0]).toEqualData({
        changetype: 'replace',
        name: 'example.org',
        type: 'A',
        records: [{
          content : '1.2.3.4'
        }],
        comments: []
      });
    });

    it('it should find added comments with no comments presnt', function() {
      zoneMaster = angular.copy(sampleZone);
      zoneCurrent = angular.copy(zoneMaster);
      zoneCurrent.rrsets[0].comments.push({
        "modified_at": 123,
        "account": "admin@example.org",
        "content": "a new comment"
      });
      var changes = diffRRsets(zoneMaster.rrsets, zoneCurrent.rrsets);
      expect(changes[0].name).toBe('example.net');
      expect(changes[0].type).toBe('SOA');
      expect(changes[0].comments[0].content).toBe("a new comment");
      expect(changes.length).toBe(1);  // no additional changes
    });

    it('it should find added comments with existing comments', function() {
      zoneMaster = angular.copy(sampleZone);
      zoneCurrent = angular.copy(zoneMaster);
      zoneCurrent.rrsets[1].comments.push({
        "modified_at": 123,
        "account": "admin@example.org",
        "content": "an added comment"
      });
      var changes = diffRRsets(zoneMaster.rrsets, zoneCurrent.rrsets);
      expect(changes[0].name).toBe('example.net');
      expect(changes[0].type).toBe('NS');
      expect(changes[0].comments[0].content).toBe("a test comment");
      expect(changes[0].comments[1].content).toBe("an added comment");
      expect(changes[0].comments.length).toBe(2);  // no additional changes
      expect(changes.length).toBe(1);  // no additional changes
    });

    it('it should find modified comments', function() {
      zoneMaster = angular.copy(sampleZone);
      zoneCurrent = angular.copy(zoneMaster);
      zoneCurrent.rrsets[1].comments[0].content = "a changed comment";
      var changes = diffRRsets(zoneMaster.rrsets, zoneCurrent.rrsets);
      expect(changes[0].name).toBe('example.net');
      expect(changes[0].type).toBe('NS');
      expect(changes[0].comments[0].content).toBe("a changed comment");
      expect(changes[0].comments.length).toBe(1);  // no additional changes
      expect(changes.length).toBe(1);  // no additional changes
    });

    it('it should find removed rrsets', function() {
      zoneMaster = angular.copy(sampleZone);
      zoneCurrent = angular.copy(zoneMaster);
      zoneCurrent.rrsets.splice(1, 1);
      var changes = diffRRsets(zoneMaster.rrsets, zoneCurrent.rrsets);
      expect(changes[0]).toEqualData({
        changetype: 'replace',
        name: 'example.net',
        type: 'NS',
        records: [],
        comments: []
      });
      expect(changes.length).toBe(1);
    });

    it('it should find renamed rrsets', function() {
      zoneMaster = angular.copy(sampleZone);
      zoneCurrent = angular.copy(zoneMaster);
      zoneCurrent.rrsets[0].name = 'foo.example.org';
      var changes = diffRRsets(zoneMaster.rrsets, zoneCurrent.rrsets);
      // remove
      expect(changes[0]).toEqualData({
        changetype: 'replace',
        name: 'example.net',
        type: 'SOA',
        records: [],
        comments: []
      });
      // readd
      expect(changes[1].name).toBe('foo.example.org');
      expect(changes[1].type).toBe('SOA');
      expect(changes.length).toBe(2);
    });

  });

  describe('convertZoneToRRsetList', function() {
    beforeEach(module('control'));

    it('it should not crash when comments are not supported', function() {
      var zone = {records: []};
      convertZoneToRRsetList(zone);
    });
  });

});
