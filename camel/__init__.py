#   ____                     _ 
#  / ___|__ _ _ __ ___   ___| |
# | |   / _` | '_ ` _ \ / _ \ |
# | |__| (_| | | | | | |  __/ |
#  \____\__,_|_| |_| |_|\___|_|
#
                             
from flask import Flask, session, g, render_template, send_from_directory
import flask.ext.assets
import json
import os.path

app = Flask(__name__, instance_relative_config=True)
app.config.from_object('camel.default_settings')
app.config.from_pyfile('pdnscontrol.conf')

config = None
with app.open_instance_resource('config.json') as f:
    config = json.loads(f.read())

asset_env = flask.ext.assets.Environment(app)
asset_env.debug = app.debug

@app.errorhandler(404)
def not_found(error):
    return 'Not found', 404

from camel.utils import inject_config
from camel.views import pages, account, admin, api
app.register_blueprint(pages.mod)
app.register_blueprint(account.mod, url_prefix='/account')
app.register_blueprint(api.mod, url_prefix='/api')
app.register_blueprint(admin.mod, url_prefix='/admin')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')

log_file = app.config['LOG_FILE']
if log_file is not None and log_file != '':
    import logging
    import logging.handlers
    file_handler = logging.handlers.RotatingFileHandler(os.path.join(app.instance_path, log_file), maxBytes=(100*1024*1024), delay=True)
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s [in %(pathname)s:%(lineno)d]: %(message)s'
))
    app.logger.addHandler(file_handler)

del log_file
