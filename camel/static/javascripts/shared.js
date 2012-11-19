
function server_start_stop_restart(server, action) {
  var action_title_list = {restart: 'Restart', stop: 'Shutdown', start: 'Start'};
  var action_title = action_title_list[action];
  var html = '<h3>'+action_title+' '+server.type+' on '+server.name+'</h3>' +
    '<div class="row output"></div>' +
    '<div class="row"><div class="right"><div class="inline-block spinner"></div>' +
    '<div class="inline-block">' +
    '<input type=button class="small button success" value="' + action_title + '"> ' +
    '<input type=button class="small button alert" value="Cancel">' +
    '</div></div>';

  var modal = get_modal('fixedWidth1000', html);

  modal.find('input.success').click(function() {
    var spinner = modal.find('.spinner').spin('small');
    $.ajax({
      url: server.url+action,
      dataType: "json",
      type: 'POST'
    }).done(function(result) {
      if (result.success) {
        modal.find('.output').
          empty().
          append("<label>Success:</label>").
          append($('<pre>').text(result.output));
        modal.find('input.alert').remove();
        modal.find('input.success').
          val('Close').
          unbind('click').
          click(function() {
            modal.trigger('reveal:close');
          });
      } else {
        modal.find('.output').
          empty().
          append("<label class=error>"+action_title+" failed:</label>").
          append($('<pre>').text(result.output));
      }
    }).fail(function(jqXHR, textStatus) {
      alert('Request failed.');
    }).always(function() {
      spinner.html('');
    });
    return false; // cancel close
  });

  modal.find('input.alert').click(function() {
    modal.trigger('reveal:close');
  });

  modal.reveal();
}

function server_flush(server) {
  var html = '<h3>Flush entire cache or parts of it</h3>' +
    '<div class="row"><input id="domainToFlush" type="text"></div>' +
    '<div class="row"><div class="right"><div class="inline-block spinner"></div>' +
    '<div class="inline-block">' +
    '<input type=button class="small button success" value="Flush"> ' +
    '<input type=button class="small button alert" value="Cancel">' +
    '</div></div>';

  var modal = get_modal('fixedWidth1000', html);
  var domainToFlush = $('#domainToFlush');

  modal.find('input.success').click(function() {
    var spinner = modal.find('.spinner').html('').spin('small');
    var domain = domainToFlush.val();
    var action = 'flush-cache';
    $.ajax({
      url: server.url+action,
      data: {'domain': domain},
      dataType: "json",
      type: 'POST'
    }).done(function(result) {
      spinner.text(result.content.number+" flushed");
    }).fail(function(jqXHR, textStatus) {
      spinner.html('');
      alert('Request failed.');
    });
    return false; // cancel close
  });

  modal.find('input.alert').click(function() {
    modal.trigger('reveal:close');
  });

  domainToFlush.keypress(function(e) {
    if (e.which == 13) {
      modal.find('input.success').click();
    }
  });

  modal.reveal({
    open: function() {
      domainToFlush.focus();
    }
  });
}

function get_modal(classes, client_html) {
  var modal = $('#actionModal');
  if (modal.length == 0) {
    var html = '<div id="actionModal"></div>';
    $('body').append(html);
    modal = $('#actionModal');
  }
  modal.attr('class', 'reveal-modal '+classes);
  modal.html('<a class="close-reveal-modal">&#215;</a>');
  if (client_html) {
    modal.append(client_html);
  }
  return modal;
}

function server_log_grep(server, initial_query) {
  var html = '<div class=row><div class="twelve columns"><fieldset>' +
    '<legend>Log Search</legend><input type=text placeholder="Standard Input"></fieldset></div></div>' +
    '<div class=row><div class="twelve columns output"><table></table></div></div>';

  var modal = get_modal('expand', html);
  var input_field = modal.find('input');
  input_field.val(initial_query);
  var output = modal.find('.output');

  function runQuery(query) {
    $.getJSON(server.url+"log-grep?needle="+query, function(data) {
      output.html('<table></table>');
      output.find('table').dataTable({
        aaData: data.content,
        bSort: false,
        aoColumns: [{sTitle: "Line"}]
      }).fnAdjustColumnSizing();
    });
  }
  input_field.keypress(function(e) {
    if (e.keyCode == 13) {
      runQuery(this.value);
      return false;
    }
    return true;
  });

  runQuery(initial_query);
  modal.reveal({
    open: function() {
      input_field.focus();
    }
  });
}

function build_server_common(server) {
  $('#logQueryInitial').keypress(function(e) {
    if (e.which == 13) {
      server_log_grep(server, this.value);
      return false;
    }
    return true;
  });
  
  $('#btnActionRestart').click(function() {
    server_start_stop_restart(server, 'restart');
  });
  $('#btnActionShutdown').click(function() {
    server_start_stop_restart(server, 'stop');
  });
  $('#btnActionFlushCache').click(function() {
    server_flush(server);
  });

  $.getJSON(server.url+'stats', function(data) {
    if (server.type === 'Authoritative') {
      // recursor has this in config
      $("#version").html(data["version"]);
    }

    moment.lang('en');
    var startup = moment().subtract('seconds', data["uptime"]);
    $("#uptime").html(startup.format('LLLL') + " ("+startup.fromNow()+")");

    var flat = _.pairs(data);
    $("#statistics").dataTable({
      aaData: flat,
      iDisplayLength: 50,
      aoColumns: [
        {sTitle: "Variable"},
        {sTitle: "Value"}
      ]
    });
  });

  $.getJSON(server.url+'config', function(data) {
    var flat;

    if (server.type === 'Authoritative') {
      flat = data.config;
    } else {
      flat = _.pairs(data);
      // auth has this in stats
      $("#version").html(data["version-string"].split(" ")[2]);
    }

    $("#config").dataTable({
      aaData: flat,
      iDisplayLength: 50,
      aoColumns: [
        {sTitle: "Variable"},
        {sTitle: "Value"}
        ]
    });
  });

}

function build_graph_url(source, targets, opts) {

  var url = Config.graphite_server + '?_salt=' + Math.random()*10000000;
  opts = _.defaults(opts || {}, Config.graphite_default_opts);

  url = _.reduce(_.pairs(opts), function(memo, pair) {
    return memo + '&' + pair[0] + '=' + encodeURIComponent(pair[1]);
  }, url);

  url = _.reduce(targets, function(memo, target) {
    return memo + '&target=' + encodeURIComponent(target.replace(/%SOURCE%/g, source));
  }, url);

  return url;
}

function auth_show_domain(server, domain) {
  var table = $('<table></table>');
  var html = $('<div></div>').
    append($('<h3></h3>').text('Domain '+domain)).
    append(table);
  var modal = get_modal('expand', html);
  $.getJSON(server.url+'zone/'+domain, function(data) {
    var flat=[];
    $.each(data.content, function(key, value) {
      flat.push([value["name"], value["type"], value["ttl"], value["priority"], value["content"]]);
    });
    table.dataTable({
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
    modal.find('.dataTables_wrapper').css('overflow-x', 'auto'); // hackish
  });
  modal.reveal();
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
            auth_show_domain(server, aData[0]);
        });
      }
    });
  });


  build_server_common(server);
}

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

function build_index(servers) {
  $.each(servers, function(key, server) {
    var url = '/server/'+server.name;
    var serverid = key;

    var row = $(
      '<tr id="server'+key+'" data-server-name="'+server.name+'">' +
        '<td><label for="checkbox'+key+'">' +
        '<input type="checkbox" id="checkbox'+key+'"></label></td>' +
        '<td>'+server.type+'</td>' +
        '<td><a href="'+url+'">'+server.name+'</a></td>' +
        '<td class=mainip></td>' +
        '<td class=version></td>' +
        '<td class=uptime></td>' +
        '<td><span id="sparkline'+key+'"></span></td>' +
      '</tr>'
    );

    $.getJSON(server.url + 'stats', function(data) {
      var uptime = moment.duration(1.0*data.uptime, "seconds").humanize();
      row.find('.uptime').text(uptime);
      if (data.version) {
        row.find('.version').text(data.version);
      }
    });

    $.getJSON(server.url + 'config', function(data) {
      var config = data.config instanceof Array && _.object(data.config) || data;
      row.find('.mainip').text(config['local-address'] + ' ' + (config['local-ipv6']||''));
      if (config['version-string']) {
	row.find('.version').text(config["version-string"].split(" ")[2]);
      }
    });

    $('#servers > tbody').append(row);

    var suffix = Config.graphite_suffixes[server.type];
    var source = 'pdns.'+server.name.replace(/\./gm,'-')+'.'+suffix;
    var metric = {'Authoritative': 'udp-queries', 'Recursor': 'questions'}[server.type];
    $.ajax({
      dataType: 'jsonp',
      jsonp: 'jsonp',
      url: Config.graphite_server,
      data: {
        format: 'json',
        areaMode: 'first',
        from: '-300s',
        target: 'nonNegativeDerivative(' + source + '.' + metric + ')'
      },
      success: function(data) {
        if (data.length == 0) {
          console.log('No sparkline data for host '+server.name);
          return;
        }
        var points = data[0].datapoints;
        var flat = [];
        $.each(points, function(key, value) {
          flat.push(1.0*value[0]);
        });
        $("#sparkline"+serverid).sparkline(flat);
      }
    });

  });
  $('.inlinesparkline').sparkline();


  // Authoritative
  var answers = [], queries = [];
  _.each(
    _.filter(servers, function(s) { return s.type === 'Authoritative'; }),
    function(server) {
      var suffix = Config.graphite_suffixes[server.type];
      var source = 'pdns.'+server.name.replace(/\./gm,'-')+'.'+suffix;
      answers.push('nonNegativeDerivative('+source+'.udp-answers)');
      queries.push('nonNegativeDerivative('+source+'.udp-queries)');
    }
  );
  var graph_url = build_graph_url('', [
    "alias(sumSeries(" + answers.join(',') + "), 'Answers')",
    "alias(sumSeries(" + queries.join(',') + "), 'Queries')",
  ], {areaMode: 'first'});
  $('#graphDiv').
    append('<h4>Authoritative Servers</h4>').
    append($('<img>').attr('src', graph_url));


  // Recursors
  var rec_answers_each = _.map(
    ['answers0-1', 'answers1-10', 'answers10-100', 'answers100-1000', 'answers-slow', 'packetcache-hits'],
    function(a) {
      return 'nonNegativeDerivative(%SOURCE%.' + a + ')';
    }).join(',');
  var answers = [], queries = [];
  _.each(
    _.filter(servers, function(s) { return s.type === 'Recursor'; }),
    function(server) {
      var suffix = Config.graphite_suffixes[server.type];
      var source = 'pdns.'+server.name.replace(/\./gm,'-')+'.'+suffix;
      answers.push('sumSeries(' + rec_answers_each.replace(/%SOURCE%/g, source) + ')');
      queries.push('nonNegativeDerivative('+source+'.questions)');
    }
  );
  var graph_url = build_graph_url('', [
    "alias(sumSeries(" + answers.join(',') + "), 'Answers')",
    "alias(sumSeries(" + queries.join(',') + "), 'Queries')",
  ], {areaMode: 'first'});
  $('#graphDiv').
    append('<h4>Recursor Servers</h4>').
    append($('<img>').attr('src', graph_url));

  $('#checkboxAll').change(function() {
    var newState = this.checked;
    $('#servers input[type="checkbox"]').prop('checked', newState);
  });

  $('#btnActionFlushCache').click(function() {
    $('#servers input[type=checkbox]')
    var server_names = $('#servers tr[data-server-name] input[type=checkbox]:checked').parents('tr').map(function(k,v) { return v.dataset.serverName; });

    if (server_names.length == 0) {
      // TODO: never come here in the first place
      alert('Please select servers to flush.');
      return;
    }

    multi_flush(_.filter(servers, function(server) {
      return _.contains(server_names, server.name);
    }));
  });

}

function multi_flush(servers) {
  var html = '<h3>Flush entire cache or parts of it</h3>' +
    '<div class="row"><input id="domainToFlush" type="text"></div>' +
    '<div class="row"><div class="output" style="margin-left: 4em;">Servers:<br></div></div>' +
    '<div class="row"><div class="right"><div class="inline-block spinner"></div>' +
    '<div class="inline-block">' +
    '<input type=button class="small button success" value="Flush"> ' +
    '<input type=button class="small button alert" value="Cancel">' +
    '</div></div>';

  var modal = get_modal('fixedWidth1000', html);
  var domainToFlush = $('#domainToFlush');

  modal.find('.output').append(
    $('<ul></ul>').append(
      _.map(servers, function(server) { return $('<li>').text(server.name).attr('data-server-name', server.name).append(' &nbsp;  <span class=result></span>'); })
    )
  );

  modal.find('input.success').click(function() {
    var spinner = modal.find('.spinner').html('').spin('small');
    var domain = domainToFlush.val();
    var action = 'flush-cache';
    var requests_done = 0;

    _.each(servers, function(server) {
      var output_result = modal.find('.output ul li[data-server-name="'+server.name+'"] span.result');
      output_result.text('Working...');
      $.ajax({
        url: server.url+action,
        data: {'domain': domain},
        dataType: "json",
        type: 'POST'
      }).done(function(result) {
        output_result.text(result.content.number+" flushed");
      }).fail(function(jqXHR, textStatus) {
        output_result.html('<b>Request failed.</b>');
      }).always(function() {
        requests_done = requests_done+1;
        if (requests_done === servers.length) {
          spinner.html('');
        }
      });
    });

    return false; // cancel close
  });

  modal.find('input.alert').click(function() {
    modal.trigger('reveal:close');
  });

  domainToFlush.keypress(function(e) {
    if (e.which == 13) {
      modal.find('input.success').click();
    }
  });

  modal.reveal({
    open: function() {
      domainToFlush.focus();
    }
  });
}
