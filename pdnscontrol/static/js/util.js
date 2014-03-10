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
