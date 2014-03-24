import urlparse
from flask import Blueprint, request
from flask import jsonify, make_response
from flask.ext.security import roles_required, current_user
from flask.ext.security.utils import encrypt_password

from pdnscontrol.utils import jsonarify, fetch_remote, fetch_json, api_auth_required
from pdnscontrol.models import db, Server, User

mod = Blueprint('api', __name__)


def forward_remote_response(response):
    return make_response(
        (
            response.content,
            response.status_code,
            {'Content-Type': response.headers.get('Content-Type')}
        )
    )


def forward_request(server, remote_url, params=None):
    server = db.session.query(Server).filter_by(name=server).first()
    if server is None:
        return jsonify(errors={'name': "Not found"}), 404

    response = fetch_remote(
        server.pdns_url + remote_url,
        method=request.method,
        data=request.data,
        accept=request.headers.get('Accept'),
        params=params
    )
    return forward_remote_response(response)


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
    obj = Server()
    obj.mass_assign(request.json)
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
        return jsonify(errors={'name': "Not found"}), 404

    server = obj.to_dict()

    try:
        response = fetch_remote(
            obj.pdns_url + '/servers/localhost',
            method='GET',
            accept=request.headers.get('Accept')
        )
        s = response.json()
        s.update(server)
        s['id'] = s['_id']
        server = s
    except StandardError:
        pass

    # make sure JS doesn't loop endlessy
    server['version'] = server.get('version', '')

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
    obj = Server.query.filter_by(name=server).first()
    if not obj:
        return jsonify(errors={'name': "Not found"}), 404
    obj.mass_assign(request.json)
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
    return forward_request(server, '/servers/localhost/zones')


@mod.route('/servers/<server>/zones', methods=['POST'])
@api_auth_required
@roles_required('edit')
def zone_create(server):
    return forward_request(server, '/servers/localhost/zones')


@mod.route('/servers/<server>/zones/<zone>')
@api_auth_required
@roles_required('view')
def zone_get(server, zone):
    return forward_request(server, '/servers/localhost/zones/' + zone)


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


@mod.route('/servers/<server>/search-data')
@api_auth_required
@roles_required('edit')
def server_searchdata(server):
    q = request.values.get('q')
    return forward_request(server, '/servers/localhost/search-data', {'q': q})


@mod.route('/servers/<server>/search-log')
@api_auth_required
@roles_required('edit')
def server_loggrep(server):
    q = request.values.get('q')
    return forward_request(server, '/servers/localhost/search-log', {'q': q})


@mod.route('/servers/<server>/flush-cache', methods=['POST'])
@api_auth_required
@roles_required('edit')
def server_flushcache(server):
    server = db.session.query(Server).filter_by(name=server).first()
    if server is None:
        return jsonify(errors={'name': "Not found"}), 404

    domain = request.values.get('domain', '')

    remote_url = server.pdns_url
    remote_url += '/jsonstat?command=flush-cache&domain=' + domain

    data = fetch_json(remote_url)

    return jsonify({'domain': domain, 'content': data})


# pdns_control protocol tunnel
@mod.route('/servers/<server>/control', methods=['POST'])
@api_auth_required
@roles_required('edit')
def server_control(server):
    server = db.session.query(Server).filter_by(name=server).first()
    if server is None:
        return jsonify(errors={'name': "Not found"}), 404

    data = {'parameters': request.values.get('command', '')}

    remote_url = server.pdns_url
    remote_url += '/jsonstat?command=pdns-control'

    r = fetch_remote(remote_url, method=request.method, data=data)
    return forward_remote_response(r)


@mod.route('/servers/<server>/statistics', methods=['GET'])
@api_auth_required
@roles_required('stats')
def server_stats(server):
    return forward_request(server, '/servers/localhost/statistics')


@mod.route('/servers/<server>/config', methods=['GET'])
@api_auth_required
@roles_required('stats')
def server_config(server):
    return forward_request(server, '/servers/localhost/config')


@mod.route('/servers/<server>/config/<config>', methods=['GET'])
@api_auth_required
@roles_required('stats')
def server_config_detail(server, config):
    return forward_request(server, '/servers/localhost/config/' + config)


@mod.route('/servers/<server>/config/<config>', methods=['PUT'])
@api_auth_required
@roles_required('edit')
def server_config_edit(server, config):
    return forward_request(server, '/servers/localhost/config/' + config)


@mod.route('/servers/<server>/start', methods=['POST'])
@api_auth_required
@roles_required('edit')
def server_start(server):
    return forward_request(server, '/manage/start', params=request.values)


@mod.route('/servers/<server>/stop', methods=['POST'])
@api_auth_required
@roles_required('edit')
def server_stop(server):
    return forward_request(server, '/manage/stop', params=request.values)


@mod.route('/servers/<server>/restart', methods=['POST'])
@api_auth_required
@roles_required('edit')
def server_restart(server):
    return forward_request(server, '/manage/restart', params=request.values)


@mod.route('/servers/<server>/update', methods=['POST'])
@api_auth_required
@roles_required('edit')
def server_update(server):
    return forward_request(server, '/manage/update', params=request.values)


@mod.route('/servers/<server>/install', methods=['POST'])
@api_auth_required
@roles_required('edit')
def server_install(server):
    return forward_request(server, '/manage/install', params=request.values)


@mod.route('/me', methods=['GET'])
@api_auth_required
def me_detail():
    data = current_user.to_dict()
    return jsonify(data)


@mod.route('/users', methods=['GET'])
@api_auth_required
@roles_required('view-users')
def users_list():
    ary = User.all()
    return jsonarify(ary)


@mod.route('/users', methods=['POST'])
@api_auth_required
@roles_required('edit-users')
def user_create():
    obj = User()
    obj.mass_assign(request.json)
    if not obj.is_valid:
        return jsonify(errors=obj.validation_errors), 422
    if request.json.get('password', '') not in ['', None]:
        obj.password = encrypt_password(request.json['password'])
    db.session.add(obj)
    db.session.commit()
    return jsonify(**obj.to_dict())


@mod.route('/users/<int:user>', methods=['GET'])
@api_auth_required
@roles_required('view-users')
def user_get(user):
    obj = User.query.filter_by(id=user).first()
    if not obj:
        return jsonify(errors={'name': "Not found"}), 404

    user = obj.to_dict()
    return jsonify(**user)


@mod.route('/users/<int:user>', methods=['PUT'])
@api_auth_required
@roles_required('edit-users')
def user_edit(user):
    obj = User.query.filter_by(id=user).first()
    if not obj:
        return jsonify(errors={'name': "Not found"}), 404
    obj.mass_assign(request.json)
    if not obj.is_valid:
        return jsonify(errors=obj.validation_errors), 422
    if request.json.get('password', '') not in ['', None]:
        obj.password = encrypt_password(request.json['password'])
    db.session.add(obj)
    db.session.commit()
    return jsonify(**obj.to_dict())
