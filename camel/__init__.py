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

f = open('config.json', 'r')
config = json.loads(f.read())
f.close()
del f

app = Flask(__name__)
app.debug = config['DEBUG']
app.secret_key = str(config['SECRET_KEY'])

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

import logging
from logging import Formatter
if not app.debug:
    app.logger.setLevel(logging.INFO) # turn on logging for most things
    from logging.handlers import SMTPHandler
    mail_handler = SMTPHandler(config.SMTP_RELAY, config.APP_MAIL, config.ADMIN_MAIL, 'Camel critical error')
    mail_handler.setLevel(logging.ERROR)
    mail_handler.setFormatter(Formatter('''
Message type:       %(levelname)s
Location:           %(pathname)s:%(lineno)d
Module:             %(module)s
Function:           %(funcName)s
Time:               %(asctime)s

Message:

%(message)s
'''))
    app.logger.addHandler(mail_handler)

from logging.handlers import RotatingFileHandler
file_handler = RotatingFileHandler("app.log", maxBytes=(100*1024*1024), delay = (not app.debug))
if app.debug:
    file_handler.setLevel(logging.DEBUG)
else:
    file_handler.setLevel(logging.INFO)
file_handler.setFormatter(Formatter(
    '%(asctime)s %(levelname)s [in %(pathname)s:%(lineno)d]: %(message)s'
))
app.logger.addHandler(file_handler)
