function doLogShow(server, query) {
  $('#holder').html('<table id="logTable"></table>');
  $('#logModal').reveal();
  $.getJSON(
    server.url+"/jsonstat?command=log-grep&needle="+query+"&callback=?",
    function(data) {
      console.log(data);
      $('#logTable').dataTable({
        aaData: data,
        bSort: false,
        aoColumns: [{sTitle: "Line"}]
      });
      $('#logTable').dataTable().fnAdjustColumnSizing();
    }
  );
  return false;
}

function doFlush(server, domain) {
  console.log("Should start the spinner now!");
  $("#flushSpinner").spin("small");
  $.getJSON(
    server.url+'/?command=flush-cache&domain='+domain+'&callback=?',
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

function build_recursor(server) {
  var url = server.url;
  $("#server-name").html(server.name);

  var graphname = server.name.replace(new RegExp("\\.","gm"), '-');
  var graphurl = '<img src="http://89.188.0.40:8085/render/?width=686&height=308&_salt=1352972312.281&areaMode=first';
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

  $.getJSON(url+'?command=stats&callback=?', function(data) {
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

  $.getJSON(url+'?command=config&callback=?', function(data) {
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

  $.getJSON(url+'?command=domains&callback=?', function(data) {
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

  $('#logSearchForm').bind('submit', function() {
    return doLogShow(server, $('#logQuery').val());
  });
  $('#logModal form').bind('submit', function() {
    return doLogShow(server, $('#logQuery2').val());
  });

  $('#btnActionRestart').click(function() {
    server_start_stop_restart(server, 'restart');
  });
  $('#btnActionShutdown').click(function() {
    server_start_stop_restart(server, 'stop');
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
