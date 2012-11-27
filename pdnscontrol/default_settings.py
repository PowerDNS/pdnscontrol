# Default settings loaded on app startup.
# Please keep the defaults in sync with
#     instance/pdnscontrol.conf.example.

SECRET_KEY = 'changeme'
DATABASE_URI = ''

PREFERRED_URL_SCHEME = 'http'
LOG_FILE = 'app.log'

GRAPHITE_SERVER = '/graphite/render/'
IGNORE_SSL_ERRORS = False

USE_X_SENDFILE = False
SESSION_COOKIE_NAME = 'CamelSess'

DEBUG = False
