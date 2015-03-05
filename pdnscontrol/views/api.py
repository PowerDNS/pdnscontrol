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


def forward_request(server, remote_url, params=None, to_manager=False):
    server = db.session.query(Server).filter_by(name=server).first()
    if server is None:
        return jsonify(errors={'name': "Not found"}), 404

    url = server.manager_url if to_manager else server.pdns_url
    headers = {}
    if server.api_key:
        headers['X-API-Key'] = server.api_key

    response = fetch_remote(
        url + remote_url,
        method=request.method,
        data=request.data,
        accept=request.headers.get('Accept'),
        params=params,
        headers=headers
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

    headers = {}
    if obj.api_key:
        headers['X-API-Key'] = obj.api_key

    server = obj.to_dict()

    try:
        response = fetch_remote(
            obj.pdns_url + '/servers/localhost',
            method='GET',
            accept=request.headers.get('Accept'),
            headers=headers,
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


@mod.route('/servers/<server>/zones/<zone>', methods=['PUT', 'DELETE', 'PATCH'])
@api_auth_required
@roles_required('edit')
def zone_update(server, zone):
    return forward_request(server, '/servers/localhost/zones/' + zone)


@mod.route('/servers/<server>/zones/<zone>/axfr-retrieve', methods=['PUT'])
@api_auth_required
@roles_required('edit')
def zone_axfr_retrieve(server, zone):
    return forward_request(server, '/servers/localhost/zones/' + zone + '/axfr-retrieve')


@mod.route('/servers/<server>/zones/<zone>/export')
@api_auth_required
@roles_required('view')
def zone_export(server, zone):
    return forward_request(server, '/servers/localhost/zones/' + zone + '/export')


@mod.route('/servers/<server>/zones/<zone>/notify', methods=['PUT'])
@api_auth_required
@roles_required('edit')
def zone_notify(server, zone):
    return forward_request(server, '/servers/localhost/zones/' + zone + '/notify')


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


@mod.route('/servers/<server>/flush-cache', methods=['PUT'])
@api_auth_required
@roles_required('edit')
def server_flushcache(server):
    domain = request.values.get('domain')
    return forward_request(server, '/servers/localhost/flush-cache', {'domain': domain})


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
    return forward_request(server, '/manage/start', params=request.values, to_manager=True)


@mod.route('/servers/<server>/stop', methods=['POST'])
@api_auth_required
@roles_required('edit')
def server_stop(server):
    return forward_request(server, '/manage/stop', params=request.values, to_manager=True)


@mod.route('/servers/<server>/restart', methods=['POST'])
@api_auth_required
@roles_required('edit')
def server_restart(server):
    return forward_request(server, '/manage/restart', params=request.values, to_manager=True)


@mod.route('/servers/<server>/update', methods=['POST'])
@api_auth_required
@roles_required('edit')
def server_update(server):
    return forward_request(server, '/manage/update', params=request.values, to_manager=True)


@mod.route('/servers/<server>/install', methods=['POST'])
@api_auth_required
@roles_required('edit')
def server_install(server):
    return forward_request(server, '/manage/install', params=request.values, to_manager=True)


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
