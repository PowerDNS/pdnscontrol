function build_recursor(server) {
  var url = server.url;
  $("#server-name").html(server.name);

  var answers = _.map(
    ['answers0-1', 'answers1-10', 'answers10-100', 'answers100-1000', 'answers-slow', 'packetcache-hits'],
    function(a) {
      return 'nonNegativeDerivative(%SOURCE%.' + a + ')';
    });
  answers = answers.join(',');

  var graphurl = build_graph_url('pdns.'+server.name.replace(/\./gm,'-')+'.recursor', [
    "alias(nonNegativeDerivative(%SOURCE%.questions), 'Questions')",
    "alias(sumSeries("+answers+"), 'Answers')",
  ], {areaMode: 'first'});
  console.log(graphurl);

  $("#graphTab").append($('<img>').attr('src', graphurl));

  $.getJSON(url+'domains', function(data) {
    var flat = [];
    $.each(data.domains, function(key, val) {
      flat.push([val.name, val.type, val.servers, val.rdbit]);
    });

    $("#domains").dataTable({
      aaData: flat,
      iDisplayLength: 50,
      aoColumns: [
        {sTitle: "Zone"},
        {sTitle: "Type"},
        {sTitle: "Forward Servers"},
        {sTitle: "Recursion Desired"}
      ]
    });
  });

  build_server_common(server);
}
