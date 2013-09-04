#                __                            __             __
#     ____  ____/ /___  ______________  ____  / /__________  / /
#    / __ \/ __  / __ \/ ___/ ___/ __ \/ __ \/ __/ ___/ __ \/ /
#   / /_/ / /_/ / / / (__  ) /__/ /_/ / / / / /_/ /  / /_/ / /
#  / .___/\__,_/_/ /_/____/\___/\____/_/ /_/\__/_/   \____/_/
# /_/
#

from flask import Flask, session, g, render_template, send_from_directory
import flask.ext.assets
from flask.ext.security import Security, current_user
import json
import os

class Control(Flask):
    jinja_options = dict(Flask.jinja_options,
                         variable_start_string='{[',
                         variable_end_string=']}')

app = Control(__name__, instance_relative_config=True)
app.config['SECURITY_TRACKABLE'] = True
app.config.from_object('pdnscontrol.default_settings')
app.config.from_pyfile('pdnscontrol.conf')
app.config['SQLALCHEMY_DATABASE_URI'] = app.config['DATABASE_URI']

asset_env = flask.ext.assets.Environment(app)
asset_env.auto_build = app.debug
asset_env.debug = app.debug

styles_files = ["stylesheets/foundation.min.css", "stylesheets/general_foundicons.css", "stylesheets/ng-grid.css", "stylesheets/app.css"]
asset_env.register('styles', *styles_files, output='gen/styles-%(version)s.css')
js_libs_files = ["javascripts/jquery.js", "javascripts/jquery-migrate.min.js", "javascripts/moment.min.js", "javascripts/underscore.js", "javascripts/purl.js", "javascripts/spin.js", "javascripts/jquery.foundation.reveal.js", "javascripts/jquery.foundation.forms.js", "javascripts/angular.js", "javascripts/restangular.js", "javascripts/ng-grid.js"]
asset_env.register('js_libs', *js_libs_files, output='gen/js-libs-%(version)s.js')
js_pdnscontrol_files = ["javascripts/util.js", "javascripts/components.js", "javascripts/popup.js", "javascripts/graphite.js", "javascripts/models.js", "javascripts/control.js"]
asset_env.register('js_pdnscontrol', *js_pdnscontrol_files, output='gen/js-pdnscontrol-%(version)s.js')


@app.errorhandler(404)
def not_found(error):
    return 'Not found', 404

from pdnscontrol.utils import inject_config
from pdnscontrol.views import pages, admin, api
app.register_blueprint(pages.mod)
app.register_blueprint(api.mod, url_prefix='/api')
app.register_blueprint(admin.mod, url_prefix='/admin')

from .models import user_datastore
security = Security(app, user_datastore)

@app.context_processor
def inject_auth_data():
    logged_in = False
    user = current_user
    roles = []
    if user is not None:
        logged_in = True
        roles = [r.name for r in user.roles]
    return dict(user=user, logged_in=logged_in, user_roles=roles)


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')

log_file = app.config['LOG_FILE']
if log_file is not None and log_file != '':
    log_file = os.path.join(app.instance_path, log_file)
    import logging
    import logging.handlers
    file_handler = logging.handlers.RotatingFileHandler(log_file, maxBytes=(100*1024*1024), delay=False)
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s [in %(pathname)s:%(lineno)d]: %(message)s'
))
    app.logger.addHandler(file_handler)
    app.logger.warn("Starting up")

del log_file
