function templateUrl(name) {
  console.log(name);
  return ServerData.Config.url_root+'tpl/' + name + '.html';
}
