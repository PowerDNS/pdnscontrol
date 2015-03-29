from flask import Blueprint, render_template
from flask import jsonify
from flask.ext.security import login_required, roles_required, http_auth_required

from pdnscontrol.models import *


mod = Blueprint('pages', __name__)


@mod.route('/servers.json')
@http_auth_required
@roles_required('stats')
def servers_json():
    # legacy URL which we need for pdns2graphite for the time being
    servers = [{'name': s['name'], 'url': s['url'], 'daemon_type': s['daemon_type']} for s in Server.all()]
    return jsonify(servers=servers)


@mod.route('/')
@login_required
def index():
    return render_template('/pages/clientjs.html')


@mod.route('/tpl/<path:path>.html')
@login_required
def tpl(path):
    return render_template('/clientside/'+path+'.html')


@mod.route('/<path:path>')
@login_required
def catchall(path):
    return render_template('/pages/clientjs.html')
