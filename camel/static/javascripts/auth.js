function showDomain(server, domain) {
  $("#domainModal").reveal();
  $.getJSON(server.url+'zone/'+domain, function(data) {
    var flat=[];
    $.each(data.content, function(key, value) {
      flat.push([value["name"], value["type"], value["ttl"], value["priority"], value["content"]]);
    });
    console.log(flat);
    $("#domain").html("");
    $("#domain").dataTable({
      bDestroy: true,
      aaData: flat,
      bSort: false,
      aoColumns: [
        {sTitle: "Domain"},
        {sTitle: "Type"},
        {sTitle: "TTL"},
        {sTitle: "Priority"},
        {sTitle: "content"}
      ]
    });
  });
}

function build_auth(server) {
  $("#server-name").html(server.name);

  var graphurl = build_graph_url('pdns.'+server.name.replace(/\./gm,'-')+'.auth', [
    "alias(nonNegativeDerivative(%SOURCE%.udp-answers), 'Answers')",
    "alias(nonNegativeDerivative(%SOURCE%.udp-queries), 'Queries')",
  ], {areaMode: 'first'});

  $("#graphTab").append($('<img>').attr('src', graphurl));

  $.getJSON(server.url+'domains', function(data) {
    var flat = [];
    $.each(data["domains"], function(e) {
      var d = data["domains"][e];
      flat.push([
        d.name,
        d.kind,
        d.masters,
        d.serial
      ]);
    });

    $("#domains").dataTable({
      aaData: flat,
      iDisplayLength: 50,
      aoColumns: [
        {sTitle: "Domain"},
        {sTitle: "Kind"},
        {sTitle: "Masters"},
        {sTitle: "Serial"}
      ],
      fnRowCallback: function(nRow, aData, iDisplayIndex, iDisplayIndexFull) {
        $('td:eq(0)', nRow).html('<a href="#">'+aData[0]+'</a>');
        $('td:eq(0) a', nRow).click(function() {
            showDomain(server, aData[0]);
        });
      }
    });
  });


  build_server_common(server);
}
