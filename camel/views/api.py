import json

from flask import Blueprint, render_template, request, url_for, redirect, session, g
from flask import current_app, jsonify, make_response
import camel
from camel.utils import jsonpify
import requests
import urlparse

mod = Blueprint('api', __name__)

def fetch_json(remote_url):
    verify = not camel.config.get('ignore_ssl_errors', False)
    auth = None
    parsed_url = urlparse.urlparse(remote_url).netloc
    if '@' in parsed_url:
        auth = parsed_url.split('@')[0].split(':')
        auth = requests.auth.HTTPBasicAuth(auth[0], auth[1])
    r = requests.get(remote_url, headers={'user-agent': 'Camel/0'}, verify=verify, auth=auth)
    r.raise_for_status()
    assert('json' in r.headers['content-type'])
    return r.json

def build_pdns_url(server):
    remote_url = server['url']
    if server['type'] == 'Authoritative':
        remote_url = urlparse.urljoin(remote_url, '/jsonstat')
    return remote_url

@mod.route('/server/<server>/zone/<zone>')
def server_zone(server, zone):
    server = filter(lambda x: x['name'] == server, camel.config['servers'])[0]

    remote_url = build_pdns_url(server)
    remote_url += '?command=get-zone&zone=' + zone
    json = fetch_json(remote_url)

    return jsonify({'zone': zone, 'content': json})

@mod.route('/server/<server>/log-grep')
def server_loggrep(server):
    server = filter(lambda x: x['name'] == server, camel.config['servers'])[0]

    needle = request.values.get('needle')

    remote_url = build_pdns_url(server)
    remote_url += '?command=log-grep&needle=' + needle

    json = fetch_json(remote_url)

    return jsonify({'needle': needle, 'content': json})

@mod.route('/server/<server>/flush-cache')
def server_flushcache(server):
    server = filter(lambda x: x['name'] == server, camel.config['servers'])[0]

    domain = request.values.get('domain')

    remote_url = build_pdns_url(server)
    remote_url += '?command=flush-cache&domain=' + domain

    json = fetch_json(remote_url)

    return jsonify({'domain': domain, 'content': json})

@mod.route('/server/<server>/<action>')
def server_stats(server, action):
    server = filter(lambda x: x['name'] == server, camel.config['servers'])[0]

    pdns_actions = ['stats', 'domains', 'flush-cache', 'config']
    manager_actions = ['start', 'stop', 'restart', 'update', 'install']
    generic_actions = pdns_actions + manager_actions
    if action not in generic_actions:
        raise Exception("invalid api action")

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

    json = fetch_json(remote_url)

    if isinstance(json, list):
        return jsonify({action: json})
    else:
        return jsonify(json)
