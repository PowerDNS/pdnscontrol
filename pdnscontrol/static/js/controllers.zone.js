"use strict";

angular.module('ControlApp.controllers.zone', []);

angular.module('ControlApp.controllers.zone').controller('ZoneDetailCtrl',
  ['$scope', '$compile', '$timeout', 'Restangular', 'server', 'zone', function($scope, $compile, $timeout, Restangular, server, zone) {
  $scope.server = server;
  $scope.loading = false;

  $scope.master = zone;
  $scope.master.rrsets = convertZoneToRRsetList($scope.master);
  $scope.zone = Restangular.copy($scope.master);

  $scope.isClean = function() {
    return angular.equals($scope.master, $scope.zone);
  };
  $scope.hasErrors = function() {
    var l = $scope.zone.rrsets.length;
    while (l-- > 0) {
      if ($scope.zone.rrsets[l].type === undefined || $scope.zone.rrsets[l].type === '') {
        return true;
      }
    }
    return false;
  };

  $scope.rrTypes = rrTypes;
  $scope.creatableRRTypes = _.filter(rrTypes, function(t) {
    if (t.allowCreate === undefined)
      return true;
    return t.allowCreate;
  });
  $scope.canModifyType = function(rrset) {
    return rrset.type === '' || (_.findWhere($scope.creatableRRTypes, {'name': rrset.type})) !== undefined;
  };

  $scope.showMore = function() {
    $scope.rowLimit += 100;
  };

  $scope.showMoreInfiniteScroll = function() {
    $scope.showMore();
    $scope.$digest(); // force update of DOM (for nginfinitescroll)
  };

  function matchAutoPtrsToZones(possiblePtrs) {
    // NOTE: $scope.zones MUST already be filled
    var ptr;
    var matchedPtrs = [];
    var zoneCache = {};
    var pendingRequests = 0;

    function autoPtrZoneLoadMaybeComplete() {
      if (pendingRequests > 0) {
        $timeout(autoPtrZoneLoadMaybeComplete, 50);
      } else {
        // have all data, see if we actually need to change any records
        var finalPtrSet = [];
        while (ptr = matchedPtrs.pop()) {
          ptr.replacedRecords = _.filter(zoneCache[ptr.zonename].records, function(rec) {
            return rec.name === ptr.revName && rec.type === 'PTR';
          });
          if (ptr.replacedRecords.length !== 1 || ptr.replacedRecords[0].content !== ptr.record.name) {
            finalPtrSet.push(ptr);
          }
        }
        autoPtrShowPopup(finalPtrSet);
      }
    }

    // See if we have a reverse zone for each possible PTR.
    // If not, we discard it.
    // Also start fetching the reverse zones already.
    _.each(possiblePtrs, function(ptr) {
      var matchingZones = _.filter($scope.zones, function(z) {
        return ptr.revName.endsWith('.' + z.name);
      });
      matchingZones = _.sortBy(matchingZones, function(z) { return z.name });
      if (matchingZones.length === 0) {
        return;
      }
      ptr.zone = _.first(matchingZones);
      ptr.zonename = ptr.zone.name;
      if (!zoneCache[ptr.zonename]) {
        pendingRequests++;
        zoneCache[ptr.zonename] = ptr.zone;
        zoneCache[ptr.zonename].get().then(function(o) {
          zoneCache[ptr.zonename] = o;
          pendingRequests--;
        }, function(error) {
          pendingRequests--;
          alert(error);
        });
      }
      ptr.rrname = ptr.revName.replace('.'+ptr.zonename, '');
      matchedPtrs.push(ptr);
    });

    autoPtrZoneLoadMaybeComplete();
  }

  function autoPtrShowPopup(newPTRs) {
    if (newPTRs.length === 0) {
      // nothing to do
      return;
    }

    _.each(newPTRs, function(ptr) {
      ptr.done = false;
      ptr.failed = false;
      ptr.create = true;
    });

    showPopup($scope, $compile, 'zone/autoptr', function(scope) {
      scope.newPTRs = newPTRs;
      scope.inProgress = false;
      scope.errors = [];
      scope.canSave = function() {
        return !scope.inProgress && _.findWhere(scope.newPTRs, {create: true});
      };

      scope.doIt = function() {
        scope.inProgress = true;

        function maybeComplete() {
          var done = _.where(newPTRs, {done: true}).length;
          var failed = _.where(newPTRs, {done: true}).length;
          if (done == newPTRs.length) {
            // done
            scope.inProgress = false;
            scope.close();
            return;
          }
          if ((done + failed) == newPTRs.length) {
            scope.inProgress = false;
          }
        }

        _.each(newPTRs, function(ptr) {
          if (!ptr.create) {
            newPTRs.remove(ptr);
          }
        });

        _.each(newPTRs, function(ptr) {
          var change = {
            changetype: 'replace',
            name: ptr.revName,
            type: 'PTR',
            records: [{
              name: ptr.revName,
              content: ptr.record.name,
              type: 'PTR',
              ttl: ptr.record.ttl,
              disabled: false
            }]
          };

          ptr.zone.customOperation(
            'patch',
            '',
            {},
            {'Content-Type': 'application/json'},
            {'rrsets':[change]}
          ).then(function(response) {
            ptr.done = true;
            if (response.error) {
              scope.errors.push(response.error);
            }
            maybeComplete();
          }, function(errorResponse) {
            ptr.failed = true;
            scope.errors.push(errorResponse.data.error || 'Unknown server error');
            maybeComplete();
          });
        });
      };
    });
  }

  function doAutoPtr(zoneChanges) {
    var possiblePtrs = [];
    var change;
    // build possible PTR records from changes
    while (change = zoneChanges.pop()) {
      if (change.changetype !== 'replace' || change.records.length === 0) {
        continue;
      }
      var rec;
      while (rec = change.records.pop()) {
        if (rec.disabled) {
          continue;
        }
        // build name of PTR record
        var revName;
        if (change.type === 'A') {
          revName = revNameIPv4(rec.content);
        } else if (change.type === 'AAAA') {
          revName = revNameIPv6(rec.content);
        } else {
          continue;
        }
        possiblePtrs.push({record: rec, revName: revName});
      }
    }

    if (!possiblePtrs) {
      // skip fetching zones, etc.
      return;
    }

    if (!$scope.zones) {
      $scope.zones = server.all('zones').getList().then(function(zones) {
        $scope.zones = zones;
        matchAutoPtrsToZones(possiblePtrs);
      }, function(response) {
        alert('Checking for possible Automatic PTRs failed: Loading zones failed.\n' + response.content);
      });
    } else {
      matchAutoPtrsToZones(possiblePtrs);
    }
  }

  $scope.save = function() {
    $scope.zone.rrsets = syncRRsetRecordNameTypes($scope.zone.rrsets);

    // now diff
    var changes = diffRRsets($scope.master.rrsets, $scope.zone.rrsets);

    // remove _new from all records
    forAllRRsetRecords($scope.zone.rrsets, function(record) {
      record._new = undefined;
      return record;
    });

    $scope.errors = [];
    $scope.zone.customOperation(
      'patch',
      '',
      {},
      {'Content-Type': 'application/json'},
      {'rrsets': changes}
    ).then(function(response) {
      if (response.error) {
        $scope.errors.push(response.error);
        return;
      }
      // success. update local data from server
      $scope.master.records = response.records;
      $scope.master.comments = response.comments;
      $scope.master.rrsets = convertZoneToRRsetList($scope.master);
      $scope.zone = Restangular.copy($scope.master);
      // send auto ptr changes to server
      doAutoPtr(changes);
    }, function(errorResponse) {
      $scope.errors.push(errorResponse.data.error || 'Unknown server error');
    });
  };

  $scope.export = function() {
    $scope.zone.customOperation(
      'get',
      'export',
      {}
    ).then(function(response) {
      if (response.error) {
        alert(response.error);
        return;
      }
      saveAs(
        new Blob(
          [response.zone],
          {type: "text/plain;charset="+document.characterSet}
        ),
        $scope.zone.name+".zone"
      );
    }, function(errorResponse) {
      if (errorResponse.data && errorResponse.data.error) {
        alert(errorResponse.data.error);
      } else {
        alert('Unknown error from server, status '+errorResponse.status);
      }
    });
  };

  $scope.addRRSet = function() {
    // TODO: get default ttl from somewhere
    var rrset = {name: $scope.zone.name, type: '', records: [{ttl: 3600, content: '', disabled: false, _new: true}], comments: [], _new: true};
    var idx;
    for (idx = 0; idx < $scope.zone.rrsets.length; ++idx) {
      if ($scope.zone.rrsets[idx].name != $scope.zone.name) {
        break;
      }
    }
    $scope.zone.rrsets.splice(idx, 0, rrset);
  };

  function setFlags() {
    $scope.isNotifyAllowed = ($scope.zone.kind.toUpperCase() === 'MASTER' && server.mustDo('master')) || ($scope.zone.kind.toUpperCase() === 'SLAVE' && server.mustDo('slave-renotify'));
    $scope.isUpdateFromMasterAllowed = ($scope.zone.kind.toUpperCase() === 'SLAVE');
    $scope.isEditZoneAllowed = ($scope.server.daemon_type === 'Recursor') || !server.mustDo("experimental-api-readonly", "no");
    $scope.isChangeAllowed = (($scope.server.daemon_type === 'Authoritative') && ($scope.zone.kind.toUpperCase() !== 'SLAVE') && $scope.isEditZoneAllowed);
    $scope.canExport = ($scope.server.daemon_type === 'Authoritative');
  }
  setFlags();
  $scope.$watch('server.config', setFlags);

  $scope.notify_slaves = function() {
    $scope.loading = true;

    $scope.zone.customOperation('put', 'notify', {}).then(function(response) {
      $scope.loading = false;
      alert(response.result);
    }, function() {
      $scope.loading = false;
      alert('Request failed.');
    });
  };

  $scope.update_from_master = function() {
    $scope.loading = true;
    $scope.zone.customOperation('put', 'axfr-retrieve', {}).then(function(response) {
      $scope.loading = false;
      alert(response.result);
    }, function() {
      $scope.loading = false;
      alert('Request failed.');
    });
  };

  $scope.revert = function() {
    $scope.zone = Restangular.copy($scope.master);
  };

  $scope.stripZone = function(val) {
    if (val.substring(val.lastIndexOf('.'+$scope.zone.name)) === '.'+$scope.zone.name) {
      val = val.substring(0, val.lastIndexOf('.'+$scope.zone.name));
    } else if (val === $scope.zone.name) {
      val = '';
    }
    return val;
  };
  $scope.zoneDisplayName = function(val) {
    var ret;
    if (val.substring(val.lastIndexOf('.'+$scope.zone.name)) === '.'+$scope.zone.name) {
      ret = $scope.zone.name;
    } else if (val === $scope.zone.name) {
      ret = $scope.zone.name;
    } else {
      ret = ''; // zone name missing
    }
    if (ret === $scope.zone.name && ret.length > 10) {
      if ((val.length-ret.length) > 10) {
        // long label
        ret = '...';
      } else {
        // long zone name
        ret = '$ORIGIN';
      }
    }
    if (val !== $scope.zone.name) {
      ret = '.' + ret;
    }
    return ret;
  };

  $scope.editComments = function(rrset) {
    showPopup($scope, $compile, 'zone/edit_comment', function(scope) {
      $scope.rrset = rrset;
    });
  };
  $scope.ifRRsetIsNew = function(rrset, ifNew, ifNotNew) {
    // Used to associate Name and Type edit fields with the record edit form, if the record has just been inserted.
    return (rrset._new && ifNew || ifNotNew);
  };
  $scope.canDelete = function(rrset) {
    return !(
      !$scope.isChangeAllowed ||
      (rrset.type === 'SOA' && $scope.zone.name === rrset.name)
      );
  };
  $scope.canEdit = function(rrset) {
    return $scope.isChangeAllowed;
  };
  $scope.canDuplicate = function(rrset) {
    return !(
      !$scope.isChangeAllowed ||
      rrset.type === 'CNAME' ||
      (rrset.type === 'SOA' && $scope.zone.name === rrset.name)
      );
  };
  $scope.deleteRecord = function(rrset, record) {
    if (!$scope.canDelete(rrset)) {
      // how did we come here? - trash icon should be disabled
      return;
    }
    rrset.records.splice(rrset.records.indexOf(record), 1);
  };
  $scope.duplicateRecord = function(rrset, current_record) {
    // insert copy of selected record immediately after it
    var newRecord = angular.copy(current_record);
    newRecord._new = true;
    rrset.records.splice(rrset.records.indexOf(current_record), 0, newRecord);
  };
  $scope.saveInlineEdit = function(rrset) {
    // check if name/type combination hasn't been used yet
    // Note: in the error case we show a message and return a string - the string indicator failure to xeditable,
    // and it's supposed to show that string, but it doesn't.
    var finder = {name: rrset.name, type: rrset.type};
    if (!rrset.type) {
      alert('Type can not be blank.');
      return '.';
    }
    var rrsets = _.where($scope.zone.rrsets, finder);
    if (rrsets.length > 1) {
      alert('An RRset ' + finder.name + '/' + finder.type + ' already exists in this zone. Please choose another name or type.');
      return '.';
    }
    var contents = _.map(rrset.records, function(o) { return '' + o.content; });
    if (contents.length !== _.uniq(contents).length) {
      alert('Duplicate records (same content) are not allowed.');
      // not aborting, as this is not totally fatal and can cause problems when editing legacy zones.
    }
    return true;
  };

  $scope.commentsSupported = ($scope.zone.comments !== undefined);
}]);

angular.module('ControlApp.controllers.zone').controller('ZoneCommentCtrl',
  ['$scope', 'Restangular', function($scope, Restangular) {
  var qname = $scope.rrset.name;
  var qtype = $scope.rrset.type;

  $scope.master = $scope.rrset.comments;
  $scope.comments = Restangular.copy($scope.master);

  $scope.isClean = function() {
    return angular.equals($scope.master, $scope.comments);
  };
  $scope.addComment = function() {
    $scope.comments.push({'content': '', 'account': ServerData.User.email, '_new': true, 'name': qname, 'type': qtype});
  };
  $scope.removeComment = function(index) {
    $scope.comments.splice(index, 1);
  };
  $scope.close = function() {
    var i, c;
    for (i = 0; i < $scope.comments.length; i++) {
      c = $scope.comments[i];
      if (c.content && !c.modified_at) {
        c.modified_at = moment().unix();
      }
      if (!c.content && c._new) {
        $scope.comments.splice(i, 1);
        i--;
      }
    }
    $scope.rrset.comments = $scope.comments;
    $scope.$emit("finished");
  };

  // be nice and allow instant typing into a new comment
  if ($scope.isChangeAllowed) {
    $scope.addComment();
  }
}]);

angular.module('ControlApp.controllers.zone').controller('ZoneEditCtrl',
  ['$scope', '$location', 'Restangular', 'server', 'zone', function($scope, $location, Restangular, server, zone) {
  $scope.server = server;
  $scope.master = zone;
  $scope.errors = [];

  if (server.daemon_type === 'Recursor') {
    $scope.zone_types = ['Native', 'Forwarded'];
    $scope.arrays = ['server'];
    if (!$scope.master._url) {
      $scope.master.kind = 'Native';
      $scope.master.recursion_desired = false;
      $scope.master.single_target_ip = '';
      // suggest filling out forward-to servers
      $scope.master.servers_o = $scope.master.servers_o || [{'server': ''}, {'server': ''}];
    } else {
      $scope.master.servers_o = _.map($scope.master.servers, function(o) { return {'server': o}; });
    }
  } else {
    $scope.zone_types = ['Native', 'Master', 'Slave'];
    $scope.arrays = ['master', 'nameserver'];
    if (!$scope.master._url) {
      $scope.master.kind = 'Native';
      // suggest filling out nameservers
      $scope.master.nameservers_o = [{'nameserver': ''}, {'nameserver': ''}];
      // suggest filling out masters
      $scope.master.masters_o     = [{'master': ''}, {'master': ''}];
    } else {
      $scope.master.nameservers_o = _.map($scope.master.nameservers, function(o) { return {'nameserver': o}; });
      $scope.master.masters_o     = _.map($scope.master.masters, function(o) { return {'master': o}; });
    }
  }
  $scope.zone = Restangular.copy($scope.master);

  $scope.isClean = function() {
    return angular.equals($scope.master, $scope.zone);
  };

  $scope.destroy = function() {
    if (confirm('Do you really want to delete the entire zone named "' + $scope.master.name + '"?')) {
      $scope.master.remove().then(function() {
        $location.path('/server/' + $scope.server.name + '/zones');
      });
    }
  };

  $scope.addMaster = function() {
    $scope.zone.masters_o.push({'master': ''});
  };

  $scope.removeMaster = function(index) {
    $scope.zone.masters_o.splice(index, 1);
  };

  $scope.canAddMaster = function() {
    if (!$scope.showMasters())
      return false;
    return $scope.zone.masters_o.length < 9;
  };

  $scope.showMasters = function() {
    return $scope.zone.kind === 'Slave';
  };

  $scope.addNameserver = function() {
    $scope.zone.nameservers_o.push({'nameserver': ''});
  };

  $scope.removeNameserver = function(index) {
    $scope.zone.nameservers_o.splice(index, 1);
  };

  $scope.showNameservers = function() {
    return (!($scope.master._url)) && (server.daemon_type === 'Authoritative');
  };

  $scope.addServer = function() {
    $scope.zone.servers_o.push({'server': ''});
  };

  $scope.removeServer = function(index) {
    $scope.zone.servers_o.splice(index, 1);
  };

  $scope.canAddServer = function() {
    return $scope.zone.servers_o.length < 9;
  };

  $scope.showForwarders = function() {
    return $scope.zone.kind === 'Forwarded';
  };

  $scope.showSingleIpTarget = function() {
    return $scope.zone.kind === 'Native' && server.daemon_type === 'Recursor';
  };

  $scope.showMetadataOptions = function() {
    return server.daemon_type === 'Authoritative';
  };

  $scope.cancel = function() {
    var url = '/server/' + $scope.server.name;
    if (!!$scope.master._url) {
      url += '/zone/' + $scope.zone.id;
    }
    $location.path(url);
  };

  $scope.save = function() {
    var i;
    for (i = 0; i < $scope.arrays.length; i++) {
      var name = $scope.arrays[i];
      var plural = name+'s';
      $scope.zone[plural] = _.compact(_.map($scope.zone[plural+'_o'], function(o) { return o[name]; } ));
    }

    if (!!$scope.master._url) {
      // existing zone
      $scope.zone.put().then(function() {
        $location.path('/server/' + $scope.server.name + '/zone/' + $scope.zone.id);
      });
    } else {
      // new zone
      $scope.zone.post().then(function(resultObject) {
        $location.path('/server/' + $scope.server.name + '/zone/' + resultObject.id);
      }, function(response) {
        if (response.status === 422) {
          $scope.errors = [];
          _.each(response.data.errors, function(field, desc) {
            $scope.zoneForm.$setValidity("zoneForm." + field + ".$invalid", false);
          });
          if (response.data.error) {
            $scope.errors.push(response.data.error);
          }
        } else {
          alert('Server reported unexpected error ' + response.status);
        }
      });
    }
  };
}]);
