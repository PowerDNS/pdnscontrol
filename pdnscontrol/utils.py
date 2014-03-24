from flask import request, current_app
from flask import json
from flask.ext.security import http_auth_required
from functools import wraps
import requests
import urllib
import urlparse
import sys

from pdnscontrol import app


def jsonpify(*args, **kwargs):
    callback = request.args['callback']
    data = json.dumps(dict(*args, **kwargs), indent=None)
    content = str(callback) + '(' + data + ')'
    mimetype = 'application/javascript'
    return current_app.response_class(content, mimetype=mimetype)


def jsonarify(ary):
    content = json.dumps(ary)
    mimetype = 'application/json'
    return current_app.response_class(content, mimetype=mimetype)


@app.context_processor
def inject_config():
    return dict(config=current_app.config)


def api_auth_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth = request.authorization
        if auth:
            @http_auth_required
            def call():
                return f(*args, **kwargs)
            return call()
        return f(*args, **kwargs)
    return decorated_function


def auth_from_url(url):
    auth = None
    parsed_url = urlparse.urlparse(url).netloc
    if '@' in parsed_url:
        auth = parsed_url.split('@')[0].split(':')
        auth = requests.auth.HTTPBasicAuth(auth[0], auth[1])
    return auth


def fetch_remote(remote_url, method='GET', data=None, accept=None, params=None, timeout=None):
    if data is not None and type(data) != str:
        data = json.dumps(data)

    if timeout is None:
        timeout = current_app.config['REMOTE_TIMEOUT']

    verify = not current_app.config['IGNORE_SSL_ERRORS']

    headers = {
        'user-agent': 'pdnscontrol/0',
        'pragma': 'no-cache',
        'cache-control': 'no-cache'
    }
    if accept is not None:
        headers['accept'] = accept

    r = requests.request(
        method,
        remote_url,
        headers=headers,
        verify=verify,
        auth=auth_from_url(remote_url),
        timeout=timeout,
        data=data,
        params=params
        )
    try:
        if r.status_code not in (200, 400, 422):
            r.raise_for_status()
    except Exception as e:
        raise RuntimeError("While fetching " + remote_url + ": " + str(e)), None, sys.exc_info()[2]

    return r


def fetch_json(remote_url, method='GET', data=None):
    r = fetch_remote(remote_url, method=method, data=data)
    try:
        assert('json' in r.headers['content-type'])
    except Exception as e:
        raise Exception("While fetching " + remote_url + ": " + str(e)), None, sys.exc_info()[2]

    # don't use r.json here, as it will read from r.text, which will trigger
    # content encoding auto-detection in almost all cases, WHICH IS EXTREMELY
    # SLOOOOOOOOOOOOOOOOOOOOOOW. just don't.
    data = None
    try:
        data = json.loads(r.content)
    except UnicodeDecodeError:
        data = json.loads(r.content, 'iso-8859-1')
    return data
