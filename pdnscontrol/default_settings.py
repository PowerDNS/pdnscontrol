# Default settings loaded on app startup.
# Please keep the defaults in sync with
#     instance/pdnscontrol.conf.example.

SECRET_KEY = ''
DATABASE_URI = ''

SECURITY_PASSWORD_HASH = 'pbkdf2_sha512'
SECURITY_PASSWORD_SALT = None

PREFERRED_URL_SCHEME = 'http'

GRAPHITE_SERVER = 'http://127.0.0.1:8085/render/'
GRAPHITE_TIMEOUT = 30
IGNORE_SSL_ERRORS = False
REMOTE_TIMEOUT = 1.5

USE_X_SENDFILE = False
SESSION_COOKIE_NAME = 'ControlSess'

DEBUG = False
