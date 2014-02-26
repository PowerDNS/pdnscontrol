function templateUrl(name) {
  return ServerData.Config.url_root+'tpl/' + name + '.html';
}

function toKVObject(ary) {
  return {'k': ary[0], 'v': ary[1]};
}

function simpleListToKVList(ary) {
  return _.map(_.pairs(ary), toKVObject);
}

function dnsNameSort(a,b) {
  var revA = '.' + (a.split('.').reverse().join('.'));
  var revB = '.' + (b.split('.').reverse().join('.'));
  if (revA < revB) return -1;
  if (revA > revB) return 1;
  return 0;
};
