import json

from flask import Blueprint, render_template, request, url_for, redirect, session, g
from flask import current_app, jsonify, make_response
import camel
from camel.utils import jsonpify
import urlparse

mod = Blueprint('pages', __name__)

servers_public = map(lambda server: {'url': '/api/server/'+server['name']+'/', 'name': server['name'], 'type': server['type']}, camel.config['servers'])

@mod.route('/servers.json')
def servers_json():
    # legacy URL which we need for pdns2graphite for the time being
    servers = []
    for server in servers_public:
        server['url'] = urlparse.urljoin(request.url_root, server['url'])
        servers.append(server)
    return jsonify(servers=servers)

@mod.route('/')
def index():
    return render_template('/pages/index.html', servers=servers_public)

@mod.route('/server/<server>')
def server(server):
    server = filter(lambda x: x['name'] == server, servers_public)[0]
    return render_template('/pages/server.html', server=server)
