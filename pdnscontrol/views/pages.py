import json

from flask import Blueprint, render_template, request, url_for, redirect, session, g
from flask import current_app, jsonify, make_response
import urlparse

from pdnscontrol.models import *
from pdnscontrol.utils import jsonpify
from pdnscontrol.auth import requireLoggedInRole, requireLoggedIn, requireApiRole


mod = Blueprint('pages', __name__)

@mod.route('/servers.json')
@requireApiRole('stats')
def servers_json():
    # legacy URL which we need for pdns2graphite for the time being
    return jsonify(servers=Server.all())


@mod.route('/')
@requireLoggedIn
def index():
    return render_template('/pages/clientjs.html')

@mod.route('/tpl/<path:path>.html')
@requireLoggedIn
def tpl(path):
    return render_template('/clientside/'+path+'.html')

@mod.route('/<path:path>')
@requireLoggedIn
def catchall(path):
    return render_template('/pages/clientjs.html')
