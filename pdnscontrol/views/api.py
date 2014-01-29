import urlparse
import urllib
import time
import sys
from functools import wraps
from flask import Blueprint, render_template, request, url_for, redirect, session, g
from flask import current_app, jsonify, make_response
from flask.ext.security import roles_required, http_auth_required

from pdnscontrol.utils import jsonpify, jsonarify, fetch_remote, fetch_json
from pdnscontrol.models import db, Server

mod = Blueprint('api', __name__)

def forward_remote_response(response):
    return make_response(
        (
            response.content,
            response.status_code,
            {'Content-Type': response.headers.get('Content-Type')}
            )
        )


def forward_request(server, remote_url):
    server = db.session.query(Server).filter_by(name=server).first()
    if server is None:
        return jsonify(errors={'name':"Not found"}), 404

    response = fetch_remote(
        server.pdns_url + remote_url,
        method=request.method,
        data=request.data,
        accept=request.headers.get('Accept')
    )
    return forward_remote_response(response)


def api_auth_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth = request.authorization
        if auth:
            @http_auth_required
            def call():
                return f(*args, **kwargs)
            return call()
        return f(*args, **kwargs)
    return decorated_function


@mod.route('/servers', methods=['GET'])
@api_auth_required
@roles_required('view')
def server_index():
    ary = Server.all()
    return jsonarify(ary)


@mod.route('/servers', methods=['POST'])
@api_auth_required
@roles_required('edit')
def server_create():
    data = request.json['server']
    obj = Server()
    obj.mass_assign(data)
    if not obj.is_valid:
        return jsonify(errors=obj.validation_errors), 422
    db.session.add(obj)
    db.session.commit()
    return jsonify(**obj.to_dict())


@mod.route('/servers/<string:server>', methods=['GET'])
@api_auth_required
@roles_required('view')
def server_get(server):
    obj = Server.query.filter_by(name=server).first()
    if not obj:
        return jsonify(errors={'name':"Not found"}), 404

    server = obj.to_dict()
    server['stats'] = obj.sideload('stats')
    server['config'] = obj.sideload('config')
    return jsonify(**server)


@mod.route('/servers/<server>', methods=['DELETE'])
@api_auth_required
@roles_required('edit')
def server_delete(server):
    obj = Server.query.filter_by(name=server).first()
    if not obj:
        return "Not found", 404
    db.session.delete(obj)
    db.session.commit()
    return ""


@mod.route('/servers/<server>', methods=['PUT'])
@api_auth_required
@roles_required('edit')
def server_edit(server):
    data = request.json
    obj = Server.query.filter_by(name=server).first()
    if not obj:
        return jsonify(errors={'name':"Not found"}), 404
    obj.mass_assign(data)
    if not obj.is_valid:
        return jsonify(errors=obj.validation_errors), 422
    db.session.add(obj)
    db.session.commit()
    return jsonify(**obj.to_dict())


@mod.route('/servers/<server>/zones/<path:zone>/rrset', methods=['PATCH'])
@api_auth_required
@roles_required('edit')
def server_zone_rrset(server, zone):
    return forward_request(server, '/servers/localhost/zones/' + zone + '/rrset')


@mod.route('/servers/<server>/zones')
@api_auth_required
@roles_required('view')
def zone_index(server):
    server = db.session.query(Server).filter_by(name=server).first()
    if server is None:
        return jsonify(errors={'name':"Not found"}), 404

    if server.daemon_type == 'Authoritative':
        r = fetch_remote(server.pdns_url + '/servers/localhost/zones', method=request.method, data=request.data)
        return forward_remote_response(r)
    else:
        # legacy URL schema
        remote_url = urlparse.urljoin(server.pdns_url, '?command=domains')
        data = fetch_json(remote_url)
        if type(data) == dict:
            data = data['domains']
        for zone in data:
            if 'type' in zone:
                zone['kind'] = zone['type']
                del zone['type']
            if 'servers' in zone:
                zone['forwarders'] = zone['servers']
                del zone['servers']
            zone['_id'] = zone['name']
            zone['server'] = server.name

        return jsonarify(data)


@mod.route('/servers/<server>/zones', methods=['POST'])
@api_auth_required
@roles_required('edit')
def zone_create(server):
    return forward_request(server, '/servers/localhost/zones')


@mod.route('/servers/<server>/zones/<zone>')
@api_auth_required
@roles_required('view')
def zone_get(server, zone):
    server = db.session.query(Server).filter_by(name=server).first()
    if server is None:
        return jsonify(errors={'name':"Not found"}), 404

    remote_url = server.pdns_url
    if server.daemon_type == 'Authoritative':
        remote_url += '/servers/localhost/zones/' + zone
    else:
        # legacy URL schema
        # XXX broken, but why?
        remote_url += '?command=zone&zone=' + zone

    r = fetch_remote(remote_url, 'GET')
    return forward_remote_response(r)


@mod.route('/servers/<server>/zones/<zone>', methods=['PUT', 'DELETE'])
@api_auth_required
@roles_required('edit')
def zone_update(server, zone):
    return forward_request(server, '/servers/localhost/zones/' + zone)


@mod.route('/servers/<server>/zones/<zone>/export')
@api_auth_required
@roles_required('view')
def zone_export(server, zone):
    return forward_request(server, '/servers/localhost/zones/' + zone + '/export')


@mod.route('/servers/<server>/log-grep')
@api_auth_required
@roles_required('edit')
def server_loggrep(server):
    server = db.session.query(Server).filter_by(name=server).first()
    if server is None:
        return jsonify(errors={'name':"Not found"}), 404

    needle = request.values.get('needle')

    remote_url = server.pdns_url
    remote_url += '?command=log-grep&needle=' + needle

    data = fetch_json(remote_url)

    return jsonify({'needle': needle, 'content': data})


@mod.route('/servers/<server>/flush-cache', methods=['POST'])
@api_auth_required
@roles_required('edit')
def server_flushcache(server):
    server = db.session.query(Server).filter_by(name=server).first()
    if server is None:
        return jsonify(errors={'name':"Not found"}), 404

    domain = request.values.get('domain', '')

    remote_url = server.pdns_url
    remote_url += '?command=flush-cache&domain=' + domain

    data = fetch_json(remote_url)

    return jsonify({'domain': domain, 'content': data})


# pdns_control protocol tunnel
@mod.route('/servers/<server>/control', methods=['POST'])
@api_auth_required
@roles_required('edit')
def server_control(server):
    server = db.session.query(Server).filter_by(name=server).first()
    if server is None:
        return jsonify(errors={'name':"Not found"}), 404

    data = {'parameters': request.values.get('command', '')}

    remote_url = server.pdns_url
    remote_url += '?command=pdns-control'

    r = fetch_remote(remote_url, method=request.method, data=data)
    return forward_remote_response(r)


@mod.route('/servers/<server>/<action>', methods=['GET','POST'])
@api_auth_required
@roles_required('stats')
def server_action(server, action):
    server = db.session.query(Server).filter_by(name=server).first()
    if server is None:
        return jsonify(errors={'name':"Not found"}), 404

    pdns_actions = ['stats', 'config']
    manager_actions = ['start', 'stop', 'restart', 'update', 'install']
    generic_actions = pdns_actions + manager_actions
    if action not in generic_actions:
        return "invalid api action", 404

    if action in manager_actions:
        if request.method != 'POST':
            return "must call action %s using POST" % (action,), 403
        if not Auth.getCurrentUser().has_role('edit'):
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
        remote_url = urlparse.urljoin(server.pdns_url, '?command=' + remote_action)

    data = fetch_json(remote_url)

    if isinstance(data, list):
        return jsonify({action: data})
    else:
        return jsonify(data)
