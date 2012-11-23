import json

from flask import Blueprint, render_template, request, url_for, redirect, session, g
from flask import current_app, jsonify, make_response
import urlparse

from pdnscontrol import config
from pdnscontrol.utils import jsonpify
from pdnscontrol.auth import requireLoggedInRole, requireLoggedIn, requireApiRole, CamelAuth


mod = Blueprint('pages', __name__)

def servers_public():
    servers = []
    for server in config['servers']:
        server = {
            'url': request.url_root + 'api/server/'+server['name']+'/',
            'name': server['name'],
            'type': server['type']
            }
        servers.append(server)
    return servers

@mod.route('/servers.json')
@requireApiRole('stats')
def servers_json():
    # legacy URL which we need for pdns2graphite for the time being
    return jsonify(servers=servers_public())


@mod.route('/')
@requireLoggedIn
def index():
    return render_template('/pages/index.html', servers=servers_public())


@mod.route('/server/<server>')
@requireLoggedInRole('view')
def server(server):
    server = filter(lambda x: x['name'] == server, servers_public())[0]
    return render_template('/pages/server.html', server=server)
