import json

from flask import Blueprint, render_template, request, url_for, redirect, session, g, jsonify
import camel
from camel.utils import jsonpify

mod = Blueprint('pages', __name__)

@mod.route('/servers.json')
def servers_json():
    return jsonify(servers=camel.config['servers'])

@mod.route('/')
def index():
    return render_template('/pages/index.html', servers=camel.config['servers'])

@mod.route('/server/<server>')
def server(server):
    server = filter(lambda x: x['name'] == server, camel.config['servers'])[0]
    return render_template('/pages/server.html', server=server)
