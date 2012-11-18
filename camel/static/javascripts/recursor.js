function build_recursor(server) {
  var url = server.url;
  $("#server-name").html(server.name);

  var graphname = server.name.replace(new RegExp("\\.","gm"), '-');
  var graphurl = '<img src="'+Config.graphite_server+'?width=686&height=308&_salt=1352972312.281&areaMode=first';
  graphurl += '&target=alias(nonNegativeDerivative(pdns.'+graphname+'.recursor.questions),\'Questions\')';
  graphurl += '&target=alias(sumSeries(';
  graphurl += 'nonNegativeDerivative(pdns.'+graphname+'.recursor.answers0-1),';
  graphurl += 'nonNegativeDerivative(pdns.'+graphname+'.recursor.answers1-10),';
  graphurl += 'nonNegativeDerivative(pdns.'+graphname+'.recursor.answers10-100),';
  graphurl += 'nonNegativeDerivative(pdns.'+graphname+'.recursor.answers100-1000),';
  graphurl += 'nonNegativeDerivative(pdns.'+graphname+'.recursor.answers-slow),';
  graphurl += 'nonNegativeDerivative(pdns.'+graphname+'.recursor.packetcache-hits)), \'Answers\')';
  graphurl += '&bgcolor=FFFFFF&majorGridLineColor=darkgray&minorGridLineColor=gray&fgcolor=000000">';
  $("#graphTab").html(graphurl);

  console.log(url);

  $.getJSON(url+'stats', function(data) {
    var flat = [];
    $.each(data, function(e) {
      flat.push([e, data[e]]);
    });

    $("#version").html("3.5-pre"); // data["version"]);
    moment.lang('en');
    console.log("Uptime: "+data["uptime"]);
    var startup = moment().subtract('seconds', data["uptime"]);
    $("#uptime").html(startup.format('LLLL') + " ("+startup.fromNow()+")");
    $("#statistics").dataTable({
      aaData: flat,
      iDisplayLength: 50,
      aoColumns:  [{sTitle: "variable"}, {sTitle: "value"}]
    });
  });

  $.getJSON(url+'config', function(data) {
    var flat = [];
    $.each(data, function(e) {
      flat.push([e, data[e]]);
    });

    $("#config").dataTable({
      aaData: flat,
      iDisplayLength: 50,
      aoColumns: [{sTitle: "variable"}, {sTitle: "value"}]
    });
    $("#version").html(data["version-string"].split(" ")[2]);
  });

  $.getJSON(url+'domains', function(data) {
    var flat = [];
    $.each(data, function(key, val) {
      flat.push([val.name, val.type, val.servers, val.rdbit]);
    });

    $("#domains").dataTable({
      aaData: flat,
      iDisplayLength: 50,
      aoColumns: [{sTitle: "Zone"}, {sTitle: "Type"}, {sTitle: "Forward Servers"}, {sTitle: "Recursion Desired"}]
    });
  });

  build_server_common(server);
}
