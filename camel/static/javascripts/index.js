function build_index(servers) {
  $.each(servers, function(key, v) {
    var url = (v.type === 'Authoritative') ? 'auth.html' : 'recursor.html';

    $('<tr><td><label for="checkbox3"><input type="checkbox" id="checkbox3"></label></td>' +
      '<td>'+v.type+'</td><td><a href="'+url+'?server-name='+v.name+'">'+v.name+'</a></td><td id="mainip'+key+'"></td><td id="version' +
      key+'">...</td><td id="up'+key+'">...</td><td><span id="sparkline'+key+'"></span></td></tr>').appendTo('#servers > tbody:last');
    if(v.type==='Authoritative') {
      $.getJSON(
        v.url+"/jsonstat?command=get&version&uptime&callback=?",
	function(data) {
	  $("#version"+key).html(data["version"]);
	  $("#up"+key).html(moment.duration(data["uptime"], "seconds").humanize());
	}
      );
      $.getJSON(
        v.url+"/jsonstat?command=config&version&callback=?",
	function(data) {
	  $.each(data, function(one, two) { if(two[0]=="local-address" || two[0]=="local-ipv6")
	    $("#mainip"+key).append(two[1]+" ") });
        }
      );
    }
    if(v.type==='Recursor') {
      $.getJSON(
        v.url+"/?command=stats&callback=?",
	function(data) {
	  $("#up"+key).html(moment.duration(1.0*data["uptime"], "seconds").humanize());
	}
      );
      $.getJSON(
        v.url+"/?command=config&callback=?",
	function(data) {
	  $("#mainip"+key).html(data["local-address"]);
	  $("#version"+key).html(data["version-string"].split(" ")[2]);
	}
      );
    }
  });
  $('.inlinesparkline').sparkline();

  var authurl='http://89.188.0.40:8085/render/?width=680&height=308&_salt=1352972312.281&areaMode=first';
  authurl +='&target=alias(sumSeries(';

  var recursorurl = authurl;

  var authQueries='', authAnswers='', recursorQueries='',  recursorAnswers='';

  $.each(servers, function(key, v) {
    var metricPrefix = 'pdns.' + v.name.replace(new RegExp("\\.", "gm"), '-') + '.';

    $.ajax({
      dataType: 'jsonp',
      'jsonp': 'jsonp',
      url: "http://89.188.0.40:8085/render/?format=json&areaMode=first&jsonp=?&from=-300s&target=nonNegativeDerivative("+metricPrefix +
	(v.type == 'Authoritative' ? "auth.udp-queries)" : "recursor.questions)"),
      success: function(data) {
	var points = data[0].datapoints;
	var flat=[];
	$.each(points, function(key, value) {
	  flat.push(1.0*value[0]);
	});
	$("#sparkline"+key).sparkline(flat);
      }
    });

    if(v.type == 'Authoritative') {
      if(authAnswers != '') authAnswers += ',';
      if(authQueries != '') authQueries += ',';
      authAnswers += 'nonNegativeDerivative('+metricPrefix+'auth.udp-answers)';
      authQueries += 'nonNegativeDerivative('+metricPrefix+'auth.udp-queries)';
    } else {
      if(recursorAnswers != '') recursorAnswers += ',';
      if(recursorQueries != '') recursorQueries += ',';

      recursorAnswers += 'sumSeries(';
      recursorAnswers += 'nonNegativeDerivative('+metricPrefix+'recursor.answers0-1),';
      recursorAnswers += 'nonNegativeDerivative('+metricPrefix+'recursor.answers1-10),';
      recursorAnswers += 'nonNegativeDerivative('+metricPrefix+'recursor.answers10-100),';
      recursorAnswers += 'nonNegativeDerivative('+metricPrefix+'recursor.answers100-1000),';
      recursorAnswers += 'nonNegativeDerivative('+metricPrefix+'recursor.answers-slow),';
      recursorAnswers += 'nonNegativeDerivative('+metricPrefix+'recursor.packetcache-hits))';

      recursorQueries += 'nonNegativeDerivative('+metricPrefix+'recursor.questions)';
    }
  });

  authurl += authQueries + '), \'Queries\')&target=alias(sumSeries(' + authAnswers + '), \'Answers\')';
  recursorurl += recursorQueries + '), \'Queries\')&target=alias(sumSeries(' + recursorAnswers + '), \'Answers\')';

  authurl +='&bgcolor=FFFFFF&majorGridLineColor=darkgray&minorGridLineColor=gray&fgcolor=000000';
  recursorurl += '&bgcolor=FFFFFF&majorGridLineColor=darkgray&minorGridLineColor=gray&fgcolor=000000';

  $("#graphDiv").html('<img src="'+authurl+'"><h4>Recursor Servers</h4>');
  $("#graphDiv").append('<img src="'+recursorurl+'">');

}
