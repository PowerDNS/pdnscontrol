#                __                            __             __
#     ____  ____/ /___  ______________  ____  / /__________  / /
#    / __ \/ __  / __ \/ ___/ ___/ __ \/ __ \/ __/ ___/ __ \/ /
#   / /_/ / /_/ / / / (__  ) /__/ /_/ / / / / /_/ /  / /_/ / /
#  / .___/\__,_/_/ /_/____/\___/\____/_/ /_/\__/_/   \____/_/
# /_/
#

from flask import Flask, send_from_directory
import flask.ext.assets
from flask.ext.security import Security, current_user
import os


class Control(Flask):
    jinja_options = dict(Flask.jinja_options,
                         variable_start_string='{[',
                         variable_end_string=']}')

app = Control(__name__, instance_relative_config=True)

app.config.from_object('pdnscontrol.default_settings')
app.config.from_pyfile('pdnscontrol.conf')

app.config['SECURITY_TRACKABLE'] = True
app.config['SECURITY_CHANGEABLE'] = True
app.config['SECURITY_URL_PREFIX'] = '/auth'
app.config['SECURITY_CHANGE_URL'] = '/change-password'
app.config['SECURITY_SEND_PASSWORD_CHANGE_EMAIL'] = False

app.config['SQLALCHEMY_DATABASE_URI'] = app.config['DATABASE_URI']

if not app.config['DATABASE_URI']:
    raise Exception('DATABASE_URI must be set in pdnscontrol.conf.')
if not app.config['SECRET_KEY']:
    raise Exception('SECRET_KEY must be set in pdnscontrol.conf.')


asset_env = flask.ext.assets.Environment(app)
asset_env.auto_build = app.debug
asset_env.debug = app.debug

asset_env.register('styles', 'stylesheets/app.css', output='gen/styles-%(version)s.css')
js_libs = [
    'jquery/dist/jquery.js',
    'modernizr/modernizr.js',
    'fastclick/lib/fastclick.js',
    'foundation/js/vendor/placeholder.js',
    'foundation/js/foundation.js',
    'foundation/js/foundation/foundation.reveal.js',
    'foundation/js/foundation/foundation.topbar.js',
    'underscore/underscore.js',
    'spin.js/spin.js',
    'blob/Blob.js',
    'FileSaver/FileSaver.js',
    'angular/angular.js',
    'angular-route/angular-route.js',
    'angular-xeditable/dist/js/xeditable.js',
    'restangular/dist/restangular.js',
    'moment/moment.js',
    'jstz-detect/jstz.js',
    'jquery.sparkline/dist/jquery.sparkline.js',
    'nginfinitescroll/build/ng-infinite-scroll.js'
]
js_libs_files = ['bower_components/'+x for x in js_libs]
asset_env.register('js_libs', *js_libs_files, output='gen/js-libs-%(version)s.js')
js_app = [
    "util.js",
    "components.js",
    "popup.js",
    "pageVisibility.js",
    "graphite.js",
    "models.js",
    "breadcrumbs.js",
    "httpRequestTracker.js",
    "controllers.me.js",
    "controllers.server.js",
    "controllers.ui.js",
    "controllers.user.js",
    "controllers.zone.js",
    "control.js"
]
js_app_files = ['js/'+x for x in js_app]
asset_env.register('js_pdnscontrol', *js_app_files, output='gen/js-app-%(version)s.js')


@app.errorhandler(404)
def not_found(error):
    return 'Not found', 404

from pdnscontrol.views import pages, api, graphite
app.register_blueprint(pages.mod)
app.register_blueprint(api.mod, url_prefix='/api')
app.register_blueprint(graphite.mod, url_prefix='/graphite')

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


@app.context_processor
def inject_config():
    return {'GRAPHITE_SERVER': app.config['GRAPHITE_SERVER']}


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')
