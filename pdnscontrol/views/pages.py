from flask import Blueprint, render_template, request, url_for, redirect, session, g
from flask import current_app, jsonify, make_response
from flask.ext.security import login_required, roles_required, http_auth_required
import urlparse

from pdnscontrol.models import *
from pdnscontrol.utils import jsonpify


mod = Blueprint('pages', __name__)

@mod.route('/servers.json')
@http_auth_required
@roles_required('stats')
def servers_json():
    # legacy URL which we need for pdns2graphite for the time being
    return jsonify(servers=Server.all())


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
