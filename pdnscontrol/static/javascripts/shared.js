; // shared.js

function server_start_stop_restart(server, action) {
  var action_title_list = {restart: 'Restart', stop: 'Shutdown', start: 'Start'};
  var action_title = action_title_list[action];
  var html = '<h3>'+action_title+' '+server.type+' on '+server.name+'</h3>' +
    '<div class="row output"></div>' +
    '<div class="row"><div class="right"><div class="inline-block spinner"></div>' +
    '<div class="inline-block">' +
    '<input type=button class="small button success" value="' + action_title + '"> ' +
    '<input type=button class="small button cancel" value="Cancel">' +
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
        modal.find('input.cancel').remove();
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

  modal.find('input.cancel').click(function() {
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
    '<input type=button class="small button cancel" value="Cancel">' +
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

  modal.find('input.cancel').click(function() {
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
  var was_open = modal.hasClass('open');
  if (was_open) {
    classes += ' open';
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
        aaSorting: [[0, 'desc']],
        bSort: true,
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

function servers_log_grep(servers, initial_query) {
  var html = '<div class=row><div class="twelve columns"><fieldset>' +
    '<legend>Log Search</legend><input type=text placeholder="Standard Input"></fieldset></div></div>' +
    '<div class=row><div class="twelve columns output"><table></table></div></div>';

  var modal = get_modal('expand', html);
  var input_field = modal.find('input');
  input_field.val(initial_query);
  var output = modal.find('.output');

  output.html('<table></table>');
  output.find('table').dataTable({
    aoColumns: [{sTitle: "Line"}]
  }).fnAdjustColumnSizing();

  function runQuery(query) {
    output.find('table').dataTable().fnClearTable();
    _.each(servers, function(server) {
      $.getJSON(server.url+"log-grep?needle="+query, function(data) {
        output.find('table').dataTable().fnAddData(
          data.content
          );
      });
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
  $('#btnActionDeploy').click(function() {
    alert('Server is up to date.');
    return;
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

function load_zone(server, zone, callback) {
  $.getJSON(server.url+'zones/'+encodeURIComponent(zone), function(data) {
    callback(data.content);
  });
}

function auth_show_domain(server, domain, zone_records) {
  var loading = $('<span>Loading...</span>');
  var html = $('<div></div>').
    append($('<h3></h3>').text('Domain '+domain)).
    append(loading);
  var modal = get_modal('expand', html);
  router_set('#view=domain&domain=' + encodeURIComponent(domain));

  function render_table(zone_records) {
    var flat=[];
    $.each(zone_records, function(key, value) {
      if (value.type != 'TYPE0') {
        flat.push([value["name"], value["type"], value["ttl"], value["priority"], value["content"]]);
      }
    });
    var table = $('<table></table>');
    loading.replaceWith(table);
    table.dataTable({
      bDestroy: true,
      bAutoWidth: 0,
      aaData: flat,
      bSort: false,
      aoColumns: [
        {sTitle: "Domain"},
        {sTitle: "Type", sWidth: "50"},
        {sTitle: "TTL", sWidth: "50"},
        {sTitle: "Priority", sWidth: "50"},
        {sTitle: "Content"},
        {sTitle: "", mData: null, sWidth: "50"}
      ],
      fnRowCallback: function(nRow, aData, iDisplayIndex, iDisplayIndexFull) {
        $('td:eq(5)', nRow).html('<button class="link-button"><i class="foundicon-edit"></i></button>');
        $('td:eq(5) button', nRow).click(function(e) {
          auth_edit_record(server, domain, aData[0], aData[1], zone_records);
          e.preventDefault();
        });
      }
    });
    modal.append(
      $('<div class="newRecord"><br><br></div>').append(
        $('<input type=text id="newRecordName">'),
        '.'+domain+' ',
        $('<select id="newRecordType"></select>'),
        ' ',
        $('<button class="button small success">Add</button>').
          click(function() {
            var qname = $('#newRecordName').val().trim();
            if (qname == '@') {
              qname = '';
            }
            if (qname != '') {
              qname = qname + '.';
            }
            qname = qname + domain;
            var qtype = $('#newRecordType').val();
            auth_edit_record(server, domain, qname, qtype, zone_records);
          })
      )
    );
    var newRecordType = $('#newRecordType');
    var record_types = ["A","NS","CNAME","SOA","MR","PTR","HINFO","MX","TXT","RP","AFSDB","SIG","KEY","AAAA","LOC","SRV","CERT","NAPTR","DS","SSHFP","RRSIG","NSEC","DNSKEY","NSEC3","NSEC3PARAM","TLSA","SPF","DLV"];
    for (var i=0; i<record_types.length; i++) {
      newRecordType.append($('<option></option>').text(record_types[i]).val(record_types[i]));
    }

    modal.find('.dataTables_wrapper').css('overflow-x', 'auto'); // hackish
  }

  if (zone_records) {
    render_table(zone_records);
  } else {
    load_zone(server, domain, function(records) {
      render_table(records);
    });
  }
  if (!modal.hasClass('open')) {
    modal.reveal({
      close: function() {
        router_set('');
      }
    });
  }
}

function auth_edit_record(server, domain, qname, qtype, zone_records) {
  var table = $('<table width=100% class="dataTable"></table>');
  var spinner;
  var errorrow = $('<div class="alert-box alert"></div>').hide();
  var actionrow = $('<div class=row></div>').append(
    $('<div class="right"><div class="inline-block spinner"></div></div>').append(
      $('<div class="inline-block"></div>').append(

        $('<button class="small button alert delete">Delete All</button>').
          click(function() {
            if (!confirm("Are you sure about deleting all " + qtype + " records?")) {
              return;
            }

            var spinner = modal.find('.spinner').html('').spin('small');

            $.ajax({
              dataType: 'json',
              url: server.url+'zones/'+encodeURIComponent(domain)+'/names/'+encodeURIComponent(qname)+'/types/'+encodeURIComponent(qtype),
              type: 'DELETE',
            }).fail(function(jqXHR, textStatus) {
              spinner.html('');
              alert(textStatus);
            }).success(function() {
              // don't pass zone_records, so auth_show_domains fetches the
              // zone anew, so it gets any changes we've made.
              auth_show_domain(server, domain);
            });

          }),
        ' &nbsp; &nbsp; ',

        $('<button class="small button success">Save</button>'),
        ' ',

        $('<button class="small button">Cancel</button>').
          click(function(){
            auth_show_domain(server, domain, zone_records);
          })
      )
    )
  );


  var html = $('<div></div>').
    append($('<h3></h3>').text('Edit ' + qname + '/' + qtype)).
    append(table).
    append('<br>').
    append(errorrow).
    append(actionrow);

  var modal = get_modal('expand', html);
  var flat = [];
  router_set('#view=edit-record&domain=' + encodeURIComponent(domain) + '&qname=' + encodeURIComponent(qname) + '&qtype=' + encodeURIComponent(qtype));

  function render_edit(zone_records) {
    table.append(
      $('<thead role=row></thead>').append(
        $('<tr></tr>').append(
          $('<th width=200>Domain</th>'),
          $('<th width=50>Type</th>'),
          $('<th width=50>TTL</th>'),
          $('<th width=50>Priority</th>'),
          $('<th>Content</th>'),
          $('<th width=50></th>')
        )
      )
    );
    var tbody = $('<tbody role=alert></body>');

    var rowId = 0;

    var this_editor_state = {
      rrset: [],
      max_row_id: 0
    };

    modal.find('.success').
      click(function() {
        var spinner = modal.find('.spinner').html('').spin('small');

        $.ajax({
          dataType: 'json',
          url: server.url+'zones/'+encodeURIComponent(domain)+'/names/'+encodeURIComponent(qname)+'/types/'+encodeURIComponent(qtype),
          type: 'POST',
          data: JSON.stringify({records: this_editor_state.rrset}),
          contentType: 'application/json; charset=utf-8'
        }).fail(function(jqXHR, textStatus) {
          spinner.html('');
          alert(textStatus);
        }).success(function(data) {
          if (data.error) {
            errorrow.text(data.error).show();
            spinner.html('');
          } else {
            // don't pass zone_records, so auth_show_domains fetches the
            // zone anew, so it gets any changes we've made.
            auth_show_domain(server, domain);
          }
        })
      });

    function render_record(editor_state, record, rowId) {
      function blur_field() {
        var $this = $(this);
        var fieldname = $this.data().field;
        record[fieldname] = $this.text().trim();
      }
      function keydown_field(e) {
        if (e.keyCode == 13) {
          return false;
        }
      }
      function paste_field(e) {
        var that = $(this);
        window.setTimeout(function() {
          that.text(that.text());
        }, 1);
      }

      var row = $('<tr></tr>').
        append(
          $('<td></td>').text(record.name),
          $('<td></td>').text(record.type),
          $('<td contenteditable=true data-field="ttl"></td>').text(record.ttl),
          $('<td contenteditable=true data-field="priority"></td>').text(record.priority),
          $('<td contenteditable=true data-field="content"></td>').text(record.content),
          $('<td class=actions></td>').append(
            $('<button class="link-button"><i class="foundicon-trash"></i></button>').click(function(e) {
              editor_state.rrset.splice(editor_state.rrset.indexOf(record), 1);
              row.remove();
              e.preventDefault();
            })
          )
        );
      row.find('td[contenteditable=true]').
        keydown(keydown_field).
        blur(blur_field).
        bind('paste', paste_field);
      return row;
    }

    function append_empty_record(editor_state) {
      var rowId = editor_state.max_row_id + 1;
      tbody.append(
        render_empty_record(editor_state, rowId)
      );
      editor_state.max_row_id = rowId;
    }

    function ensure_empty_row(editor_state) {
      var empties = tbody.find('tr.empty');
      if (empties.length == 0) {
        append_empty_record(editor_state);
      }
    }

    function render_empty_record(editor_state, rowId) {
      var record = {name: qname, type: qtype, ttl: '', content: '', priority: ''};

      function blur_empty_field() {
        var $this = $(this);
        var changed = false;
        var row = $this.parent();
        if ($this.text().trim() != '') {
          if (row.hasClass('empty')) {
            changed = true;
            row.removeClass('empty');
          }
        }

        if (changed) {
          editor_state.rrset.push(record);
          ensure_empty_row(editor_state);
        }
      }

      var tr = render_record(editor_state, record, rowId);
      tr.addClass('empty');
      tr.find('td[contenteditable=true]').blur(blur_empty_field);
      tbody.append(tr);
    }

    $.each(zone_records, function(key, record) {
      if (record.name == qname && record.type == qtype) {
        var rowId = this_editor_state.max_row_id + 1;
        // take a deep copy of record here, so we don't leak back broken
        // data or uncommitted changes to show_auth_domain
        var rec = $.extend(true, {}, record);
        this_editor_state.rrset.push(rec);
        tbody.append(render_record(this_editor_state, rec, rowId));
        this_editor_state.max_row_id = rowId;
      }
    });

    if (this_editor_state.rrset.length == 0) {
      // remote Delete button when there were no existing records
      actionrow.find('.delete').remove();
    }

    // the initial empty row
    append_empty_record(this_editor_state);

    table.append(tbody);

    // setTimeout is a hack for page reloads
    window.setTimeout(function() {
      table.find('td[contenteditable=true]').first().focus();
    }, 200);
  }

  if (zone_records) {
    render_edit(zone_records);
  } else {
    load_zone(server, domain, function(records) {
      render_edit(records);
    });
  }

  if (!modal.hasClass('open')) {
    modal.reveal({
      close: function() {
        router_set('');
      },
      open: function() {
        // setTimeout is a hack for page reloads
        window.setTimeout(function() {
          table.find('td[contenteditable=true]').first().focus();
        }, 200);
      }
    });
  }

}

function build_auth(server) {
  $("#server-name").html(server.name);

  var graphurl = build_graph_url('pdns.'+server.name.replace(/\./gm,'-')+'.auth', [
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.udp-answers), 'UDP answers'))",
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.udp-queries), 'UDP queries'))",
  ], {areaMode: 'first', title: 'UDP Queries'});

  $("#graphTab").append($('<img>').attr('src', graphurl));

  var graphurl = build_graph_url('pdns.'+server.name.replace(/\./gm,'-')+'.auth', [
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.tcp-answers), 'TCP answers'))",
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.tcp-queries), 'TCP queries'))",
  ], {areaMode: 'first', title: 'TCP Queries'});

  $("#graphTab").append($('<img>').attr('src', graphurl));

  var graphurl = build_graph_url('pdns.'+server.name.replace(/\./gm,'-')+'.auth', [
    "cactiStyle(alias(%SOURCE%.latency, 'latency'))",
  ], {title: 'Latency'});

  $("#graphTab").append($('<img>').attr('src', graphurl));

  var graphurl = build_graph_url('pdns.'+server.name.replace(/\./gm,'-')+'.auth', [
    "cactiStyle(alias(%SOURCE%.qsize-q, 'queue size'))",
  ], {title: 'Database queue'});

  $("#graphTab").append($('<img>').attr('src', graphurl));

  var graphurl = build_graph_url('pdns.'+server.name.replace(/\./gm,'-')+'.auth', [
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.corrupt-packets), 'corrupt packets'))",
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.servfail-packets), 'servfail packets'))",
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.timedout-packets), 'timed out packets'))",
  ], {title: 'Errors'});

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
        $('td:eq(0) a', nRow).click(function(e) {
          auth_show_domain(server, aData[0]);
          e.preventDefault();
        });
      }
    });
  });


  build_server_common(server);
  init_router(server);
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
  ], {areaMode: 'first', title: 'Queries'});

  $("#graphTab").append($('<img>').attr('src', graphurl));

  var graphurl = build_graph_url('pdns.'+server.name.replace(/\./gm,'-')+'.recursor', [
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.answers0-1), 'in 1ms'))",
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.answers1-10), 'in 10ms'))",
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.answers10-100), 'in 100ms'))",
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.answers100-1000), 'in 1s'))",
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.answers-slow), 'over 1s'))",
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.outgoing-timeouts), 'timeouts'))",
  ], {areaMode: 'stacked', title: 'Latency distribution'});

  $("#graphTab").append($('<img>').attr('src', graphurl));

  var graphurl = build_graph_url('pdns.'+server.name.replace(/\./gm,'-')+'.recursor', [
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.cache-hits), 'cache hits'))",
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.cache-misses), 'cache misses'))",
  ], {title: 'Cache'});

  $("#graphTab").append($('<img>').attr('src', graphurl));

  var graphurl = build_graph_url('pdns.'+server.name.replace(/\./gm,'-')+'.recursor', [
    "cactiStyle(alias(%SOURCE%.cache-entries, 'entries'))",
    "cactiStyle(alias(%SOURCE%.negcache-entries, 'negative entries'))",
  ], {areaMode: 'stacked', title: 'Cache size'});

  $("#graphTab").append($('<img>').attr('src', graphurl));

  var graphurl = build_graph_url('pdns.'+server.name.replace(/\./gm,'-')+'.recursor', [
    "cactiStyle(alias(%SOURCE%.concurrent-queries, 'queries'))",
  ], {areaMode: 'stacked', title: 'Concurrent queries'});

  $("#graphTab").append($('<img>').attr('src', graphurl));

  var graphurl = build_graph_url('pdns.'+server.name.replace(/\./gm,'-')+'.recursor', [
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.spoof-prevents), 'spoofs'))",
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.resource-limits), 'resources'))",
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.client-parse-errors), 'client'))",
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.server-parse-errors), 'server'))",
    "cactiStyle(alias(nonNegativeDerivative(%SOURCE%.tcp-client-overflow), 'tcp concurrency'))",
  ], {title: 'Exceptions'});

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
    var url = Config.url_root + 'server/'+server.name;
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

  $('#btnActionDeploy').click(function() {
    alert('Servers are up to date.');
    return;
  });

  $('#logQueryInitial').keypress(function(e) {
    if (e.which == 13) {
      servers_log_grep(servers, this.value);
      return false;
    }
    return true;
  });

  $('#btnServerAdd').click(function() {
    server_add();
  });
}


function server_add() {
  var html = '<h3>Add Server</h3>' +
    '<form class=custom>' +
    '<label>Server Name:</label><input type=text name=name placeholder="host.company.corp">' +
    '<div class=row><div class="four columns">' +
    '<label for="type1"><input name="daemon_type" type="radio" id="type1" style="display:none;" checked><span class="custom radio checked"></span> Authoritative</label>' +
    '<label for="type2"><input name="daemon_type" type="radio" id="type2" style="display:none;"><span class="custom radio"></span> Recursor</label>' +
    '</div></div>' +
    '<label>Statistics URL:</label><input type=text name=stats_url>' +
    '<label>Manager URL:</label><input type=text name=manager_url>' +
    '<div class="row"><div class="right"><div class="inline-block spinner"></div>' +
    '<div class="inline-block">' +
    '<input type=submit class="small button success" value="Save"> ' +
    '<input type=button class="small button cancel" value="Cancel">' +
    '</div></div>';

  var modal = get_modal('fixedWidth1000', html);
  var form = modal.find('form');
  form.bind('submit', function() {
    var spinner = modal.find('.spinner').html('').spin('small');
    var server = {
      name: form.find('input[name=name]').val(),
      daemon_type: null,
      stats_url: form.find('input[name=stats_url]').val(),
      manager_url: form.find('input[name=manager_url]').val()
    };
    server.daemon_type = form.find('input[name=daemon_type]')[0].checked ? 'Authoritative' : 'Recursor';

    $.ajax({
      type: 'PUT',
      url: Config.url_root + 'api/server/',
      data: JSON.stringify({server: server}),
      contentType: 'application/json; charset=utf-8'
    }).done(function(data) {
      window.location.href = Config.url_root + 'server/' + server.name;
    }).fail(function(jqXHR) {
      alert('Failed.');
    }).always(function() {
      spinner.html('');
    });

    return false;
  });

  modal.find('input.cancel').click(function() {
    modal.trigger('reveal:close');
  });

  modal.reveal({
    open: function() {
      modal.find('input')[0].focus();
    }
  });
}

function multi_flush(servers) {
  var html = '<h3>Flush entire cache or parts of it</h3>' +
    '<div class="row"><input id="domainToFlush" type="text"></div>' +
    '<div class="row"><div class="output" style="margin-left: 4em;">Servers:<br></div></div>' +
    '<div class="row"><div class="right"><div class="inline-block spinner"></div>' +
    '<div class="inline-block">' +
    '<input type=button class="small button success" value="Flush"> ' +
    '<input type=button class="small button cancel" value="Cancel">' +
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

  modal.find('input.cancel').click(function() {
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

var last_hash = "";
function init_router(server) {
  router_reroute(server);
  window.onhashchange = function() {
    router_reroute(server);
  };
}

function router_set(current_hash) {
  last_hash = current_hash;
  location.hash = current_hash;
}

function router_reroute(server) {
  var hash = location.hash;
  if (hash === last_hash) {
    return;
  }

  if (hash.slice(0,1) == '#') {
    hash = hash.slice(1);
  }

  var splitted = hash.split('&');
  var args = {};
  for (var i = 0; i < splitted.length; i++) {
    var pair = splitted[i].split('=');
    args[pair[0]] = decodeURIComponent(pair[1]);
  }
  if (!args.view) {
    return;
  }

  if (args.view == 'domain') {
    auth_show_domain(server, args.domain);
  } else if (args.view == 'edit-record') {
    auth_edit_record(server, args.domain, args.qname, args.qtype);
  }
}
