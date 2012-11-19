import requests
import urlparse
import json
import time

from flask import Blueprint, render_template, request, url_for, redirect, session, g
from flask import current_app, jsonify, make_response

from camel import config
from camel.utils import jsonpify
from camel.auth import CamelAuth, requireApiAuth, requireApiRole

mod = Blueprint('api', __name__)

def fetch_json(remote_url):
    verify = not config.get('ignore_ssl_errors', False)
    auth = None
    parsed_url = urlparse.urlparse(remote_url).netloc
    if '@' in parsed_url:
        auth = parsed_url.split('@')[0].split(':')
        auth = requests.auth.HTTPBasicAuth(auth[0], auth[1])
    r = requests.get(remote_url,
                     headers={'user-agent': 'Camel/0'},
                     verify=verify,
                     auth=auth,
                     timeout=5)
    r.raise_for_status()
    assert('json' in r.headers['content-type'])

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
    remote_url = server['url']
    if server['type'] == 'Authoritative':
        remote_url = urlparse.urljoin(remote_url, '/jsonstat')
    return remote_url


@mod.route('/server/<server>/zone/<zone>')
@requireApiRole('edit')
def server_zone(server, zone):
    server = filter(lambda x: x['name'] == server, config['servers'])[0]

    remote_url = build_pdns_url(server)
    remote_url += '?command=get-zone&zone=' + zone
    data = fetch_json(remote_url)

    return jsonify({'zone': zone, 'content': data})


@mod.route('/server/<server>/log-grep')
@requireApiRole('edit')
def server_loggrep(server):
    server = filter(lambda x: x['name'] == server, config['servers'])[0]

    needle = request.values.get('needle')

    remote_url = build_pdns_url(server)
    remote_url += '?command=log-grep&needle=' + needle

    data = fetch_json(remote_url)

    return jsonify({'needle': needle, 'content': data})


@mod.route('/server/<server>/flush-cache', methods=['POST'])
@requireApiRole('edit')
def server_flushcache(server):
    server = filter(lambda x: x['name'] == server, config['servers'])[0]

    domain = request.values.get('domain', '')

    remote_url = build_pdns_url(server)
    remote_url += '?command=flush-cache&domain=' + domain

    data = fetch_json(remote_url)

    return jsonify({'domain': domain, 'content': data})


@mod.route('/server/<server>/<action>', methods=['GET','POST'])
@requireApiRole('stats')
def server_stats(server, action):
    server = filter(lambda x: x['name'] == server, config['servers'])[0]

    pdns_actions = ['stats', 'domains', 'config']
    manager_actions = ['start', 'stop', 'restart', 'update', 'install']
    generic_actions = pdns_actions + manager_actions
    if action not in generic_actions:
        return "invalid api action", 404

    if action in manager_actions:
        if request.method != 'POST':
            return "must call action %s using POST" % (action,), 403
        if not 'edit' in CamelAuth.getCurrentUser().roles:
            return 'Not authorized', 401

    remote_url = None
    if action in manager_actions:
        target = server['type']
        remote_url = urlparse.urljoin(server['manager_url'], '/do/?action='+action+'&target='+target)

    else:
        # pdns actions
        remote_action = action
        if server['type'] == 'Authoritative':
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
