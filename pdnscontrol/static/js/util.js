function templateUrl(name) {
  return ServerData.Config.url_root+'tpl/' + name + '.html';
}

function toKVObject(ary) {
  return {'k': ary[0], 'v': ary[1]};
}

function simpleListToKVList(ary) {
  return _.map(_.pairs(ary), toKVObject);
}
