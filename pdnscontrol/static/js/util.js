function templateUrl(name) {
  "use strict";
  return ServerData.Config.url_root+'tpl/' + name + '.html';
}

function toKVObject(ary) {
  "use strict";
  return {'k': ary[0], 'v': ary[1]};
}

function simpleListToKVList(ary) {
  "use strict";
  return _.map(_.pairs(ary), toKVObject);
}

function dnsNameSort(a,b) {
  "use strict";
  var revA = '.' + (a.split('.').reverse().join('.'));
  var revB = '.' + (b.split('.').reverse().join('.'));
  if (revA < revB) return -1;
  if (revA > revB) return 1;
  return 0;
}

function zoneSort(input) {
  "use strict";
  return input.sort(function(left, right) {
    var res;
    res = dnsNameSort(left.name, right.name);
    if (res !== 0) {
      return res;
    }
    res = rrTypesSort(left.type, right.type);
    if (res !== 0) {
      return res;
    }
    return input.indexOf(left) < input.indexOf(right) ? -1 : 1;
  });
}

function toRRsetList(input) {
  "use strict";
  var output = [];
  var sorted = zoneSort(input);
  sorted.push({name: undefined, type: undefined});
  var i, last_name = null, last_type = null;
  var memo = [];
  for (i = 0; i < input.length; i++) {
    if (last_name !== sorted[i].name || last_type !== sorted[i].type) {
      if (memo.length > 0) {
        output.push({name: last_name, type: last_type, records: memo});
      }
      last_name = sorted[i].name;
      last_type = sorted[i].type;
      memo = [];
    }
    memo.push(sorted[i]);
  }
  return output;
}

function convertZoneToRRsetList(zone) {
  "use strict";
  var records = toRRsetList(zone.records);
  var comments = (zone.comments && toRRsetList(zone.comments)) || [];
  var comments_dict = {};
  var i, el;
  for (i = 0; i < comments.length; i++) {
    el = comments[i];
    comments_dict[el.name] = comments_dict[el.name] || {};
    comments_dict[el.name][el.type] = el.records;
  }
  for (i = 0; i < records.length; i++) {
    el = records[i];
    if (comments_dict[el.name] && comments_dict[el.name][el.type]) {
      el.comments = comments_dict[el.name][el.type];
    } else {
      el.comments = [];
    }
  }
  return records;
}

var rrTypes = [
  {name: 'SOA', required: true, allowCreate: false, sortWeight: -100},
  {name: 'A'},
  {name: 'AAAA'},
  {name: 'NS', sortWeight: -50},
  {name: 'CNAME'},
  {name: 'MR'},
  {name: 'PTR'},
  {name: 'HINFO'},
  {name: 'MX'},
  {name: 'TXT'},
  {name: 'RP'},
  {name: 'AFSDB'},
  {name: 'SIG'},
  {name: 'KEY'},
  {name: 'LOC'},
  {name: 'SRV'},
  {name: 'CERT'},
  {name: 'NAPTR'},
  {name: 'DS', sortWeight: -50},
  {name: 'SSHFP'},
  {name: 'RRSIG'},
  {name: 'NSEC'},
  {name: 'DNSKEY'},
  {name: 'NSEC3'},
  {name: 'NSEC3PARAM'},
  {name: 'TLSA'},
  {name: 'SPF'},
  {name: 'DLV'}
];

function rrTypesSort(a,b) {
  "use strict";
  var typeA = _.findWhere(rrTypes, {name: a}) || {};
  var typeB = _.findWhere(rrTypes, {name: b}) || {};
  var weightA = typeA.sortWeight || 0;
  var weightB = typeB.sortWeight || 0;
  if (weightA < weightB) {
    return -1;
  }
  if (weightA > weightB) {
    return 1;
  }
  if (a === b) return 0;
  if (a < b) return 1;
  return -1;
}
