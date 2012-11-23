# Default settings loaded on app startup.
# Please keep the defaults in sync with
#     instance/pdnscontrol.conf.example.

DEBUG = False
SECRET_KEY = 'changeme'
USE_X_SENDFILE = False
SESSION_COOKIE_NAME = 'CamelSess'
PREFERRED_URL_SCHEME = 'http'
LOG_FILE = 'app.log'

GRAPHITE_SERVER = '/graphite/render/'
IGNORE_SSL_ERRORS = False
