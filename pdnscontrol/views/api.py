import requests
import urlparse
import urllib
import json
import time
import sys

from flask import Blueprint, render_template, request, url_for, redirect, session, g
from flask import current_app, jsonify, make_response

from pdnscontrol.utils import jsonpify
from pdnscontrol.auth import CamelAuth, requireApiAuth, requireApiRole
from pdnscontrol.models import db, Server

mod = Blueprint('api', __name__)

def auth_from_url(url):
    auth = None
    parsed_url = urlparse.urlparse(url).netloc
    if '@' in parsed_url:
        auth = parsed_url.split('@')[0].split(':')
        auth = requests.auth.HTTPBasicAuth(auth[0], auth[1])
    return auth


def fetch_remote(remote_url, method='GET', data=None):
    verify = not current_app.config.get('IGNORE_SSL_ERRORS', False)
    r = requests.request(
        method,
        remote_url,
        headers={'user-agent': 'Camel/0'},
        verify=verify,
        auth=auth_from_url(remote_url),
        timeout=5,
        data=data
        )
    try:
        r.raise_for_status()
    except Exception as e:
        raise Exception("While fetching " + remote_url + ": " + str(e)), None, sys.exc_info()[2]

    return r


def fetch_json(remote_url, method='GET', data=None):
    r = fetch_remote(remote_url, method=method, data=data)
    try:
        assert('json' in r.headers['content-type'])
    except Exception as e:
        raise Exception("While fetching " + remote_url + ": " + str(e)), None, sys.exc_info()[2]

    # don't use r.json here, as it will read from r.text, which will trigger
    # content encoding auto-detection in almost all cases, WHICH IS EXTREMELY
    # SLOOOOOOOOOOOOOOOOOOOOOOW. just don't.
    data = None
    try:
        data = json.loads(r.content)
    except UnicodeDecodeError:
        data = json.loads(r.content, 'iso-8859-1')
    return data


def build_pdns_url(server):
    remote_url = server.stats_url
    if server.daemon_type == 'Authoritative':
        if remote_url[-1] != '/':
            remote_url = remote_url + '/'
        remote_url = remote_url + 'jsonstat'
    return remote_url


@mod.route('/server/', methods=['PUT'])
@requireApiRole('edit')
def server_create():
    obj = request.json['server']
    server = Server(obj['name'], obj['daemon_type'], obj['stats_url'], obj['manager_url'])
    db.session.add(server)
    db.session.commit()
    return jsonify(server=dict(server))


@mod.route('/server/<server>', methods=['DELETE'])
@requireApiRole('edit')
def server_delete(server):
    server = db.session.query(Server).filter_by(name=server).first()
    db.session.delete(server)
    db.session.commit()
    return ""


@mod.route('/server/<server>', methods=['POST'])
@requireApiRole('edit')
def server_edit(server):
    server = db.session.query(Server).filter_by(name=server).first()
    server.name = obj['name']
    server.daemon_type = obj['daemon_type']
    server.stats_url = obj['stats_url']
    server.manager_url = obj['manager_url']
    db.session.add(server)
    db.session.commit()
    return jsonify(server=dict(server))


@mod.route('/server/<server>/zones/<path:zone>/names/<path:qname>/types/<qtype>', methods=['GET','PUT','POST','DELETE'])
@requireApiRole('edit')
def server_zone_qname_qtype(server, zone, qname, qtype):
    server = db.session.query(Server).filter_by(name=server).first()

    remote_url = build_pdns_url(server)
    remote_url += '?command=zone-rest&rest=/{zone}/{qname}/{qtype}'.format(
        zone=urllib.quote_plus(zone.encode("utf-8")),
        qname=urllib.quote_plus(qname.encode("utf-8")),
        qtype=urllib.quote_plus(qtype.encode("utf-8"))
        )
    r = fetch_remote(remote_url, method=request.method, data=request.data)
    return make_response((r.content, r.status_code, {}))


@mod.route('/server/<server>/zones/<path:zone>')
@requireApiRole('edit')
def server_zone(server, zone):
    server = db.session.query(Server).filter_by(name=server).first()

    remote_url = build_pdns_url(server)
    remote_url += '?command=get-zone&zone=' + zone
    data = fetch_json(remote_url)

    return jsonify({'zone': zone, 'content': data})


@mod.route('/server/<server>/log-grep')
@requireApiRole('edit')
def server_loggrep(server):
    server = db.session.query(Server).filter_by(name=server).first()

    needle = request.values.get('needle')

    remote_url = build_pdns_url(server)
    remote_url += '?command=log-grep&needle=' + needle

    data = fetch_json(remote_url)

    return jsonify({'needle': needle, 'content': data})


@mod.route('/server/<server>/flush-cache', methods=['POST'])
@requireApiRole('edit')
def server_flushcache(server):
    server = db.session.query(Server).filter_by(name=server).first()

    domain = request.values.get('domain', '')

    remote_url = build_pdns_url(server)
    remote_url += '?command=flush-cache&domain=' + domain

    data = fetch_json(remote_url)

    return jsonify({'domain': domain, 'content': data})


@mod.route('/server/<server>/<action>', methods=['GET','POST'])
@requireApiRole('stats')
def server_stats(server, action):
    server = db.session.query(Server).filter_by(name=server).first()

    pdns_actions = ['stats', 'domains', 'config']
    manager_actions = ['start', 'stop', 'restart', 'update', 'install']
    generic_actions = pdns_actions + manager_actions
    if action not in generic_actions:
        return "invalid api action", 404

    if action in manager_actions:
        if request.method != 'POST':
            return "must call action %s using POST" % (action,), 403
        if not CamelAuth.getCurrentUser().has_role('edit'):
            return 'Not authorized', 401

    remote_url = None
    if action in manager_actions:
        target = server.daemon_type
        remote_url = urlparse.urljoin(server.manager_url, '/do/?action='+action+'&target='+target)

    else:
        # pdns actions
        remote_action = action
        if server.daemon_type == 'Authoritative':
            if action == 'stats':
                remote_action = 'get'
            elif action == 'config':
                remote_action = 'config'
        remote_url = urlparse.urljoin(build_pdns_url(server), '?command=' + remote_action)

    data = fetch_json(remote_url)

    if isinstance(data, list):
        return jsonify({action: data})
    else:
        return jsonify(data)
