function showDomain(server, domain) {
  $("#domainModal").reveal();
  $.getJSON(server.url+'/jsonstat?command=get-zone&callback=?&zone='+domain, function(data) {
    var flat=[];
    $.each(data, function(key, value) {
      flat.push([value["name"], value["type"], value["ttl"], value["priority"], value["content"]]);
    });
    console.log(flat);
    $("#domain").html("");
    $("#domain").dataTable({
      bDestroy: true,
      aaData: flat,
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

function doFlush(server, domain) {
  console.log("Should start the spinner now!");
  $("#flushSpinner").spin("small");
  var url = server.url+'/jsonstat?command=flush-cache&domain='+domain+'&callback=?';
  $.getJSON(
    url,
    function(data) {
      $("#flushSpinner").html(data["number"]+" flushed");
    }
  );
  $("#flushModal").close = function() {
    $("#flushSpinner").html("");
    $("#domainToFlush").val("");
  };
  return false;
}

function build_auth(server) {
  var url = server.url;
  $("#server-name").html(server.name);

  var graphname = server.name.replace(new RegExp("\\.","gm"), '-');
  var graphurl= 'http://89.188.0.40:8085/render/?width=686&height=308&_salt=1352972312.281&areaMode=first';
  graphurl += '&target=alias(nonNegativeDerivative(pdns.'+graphname+'.auth.udp-answers),\'Answers\')';
  graphurl += '&target=alias(nonNegativeDerivative(pdns.'+graphname+'.auth.udp-queries), \'Queries\')';
  graphurl += '&bgcolor=FFFFFF&majorGridLineColor=darkgray&minorGridLineColor=gray&fgcolor=000000';
  $("#graphTab").html('<img src="'+graphurl+'">');

  $.getJSON(url+'/jsonstat?command=get&callback=?', function(data) {
    var flat = [];
    $.each(data, function(e) {
      flat.push([e, data[e]]);
    });

    $("#version").html(data["version"]);
    moment.lang('en');
    var startup = moment().subtract('seconds', data["uptime"]);
    $("#uptime").html(startup.format('LLLL') + " ("+startup.fromNow()+")");
    $("#statistics").dataTable({
      aaData: flat,
      iDisplayLength: 50,
      aoColumns: [{sTitle: "variable"}, {sTitle: "value"}]
    });
  });

  $.getJSON(url+'/jsonstat?command=domains&callback=?', function(data) {
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

  $.getJSON(url+'/jsonstat?command=config&callback=?', function(data) {
    $("#config").dataTable({
      aaData: data,
      iDisplayLength: 50,
      aoColumns: [
        {sTitle: "Variable"},
        {sTitle: "Value"}
        ]
    });
  });

  $('#btnActionFlushCache').click(function() {
    $('#flushModal form').bind('submit', function() {
      return doFlush(server, $('#domainToFlush').val());
    });
    $('#flushModal input.success').click(function() {
      return doFlush(server, $('#domainToFlush').val());
    });
    $('#flushModal').reveal({
      close: function() {
        $('#flushSpinner').html('');
        },
      open: function() {
        $('#domainToFlush').focus();
        }
    });
  });
}
