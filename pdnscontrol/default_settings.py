# Default settings loaded on app startup.
# Please keep the defaults in sync with
#     instance/pdnscontrol.conf.example.

SECRET_KEY = ''
DATABASE_URI = ''

SECURITY_PASSWORD_HASH = 'pbkdf2_sha512'
SECURITY_PASSWORD_SALT = None

PREFERRED_URL_SCHEME = 'http'
LOG_FILE = 'app.log'

GRAPHITE_SERVER = '/graphite/render/'
IGNORE_SSL_ERRORS = False
REMOTE_TIMEOUT = 1.5

USE_X_SENDFILE = False
SESSION_COOKIE_NAME = 'ControlSess'

DEBUG = False
