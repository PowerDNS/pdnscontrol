from flask import Response, jsonify, request, url_for, redirect, session, g
from functools import wraps
import json

from camel import config, app

class User(object):
    def __init__(self, user_data):
        self.id = user_data['id']
        self.name = user_data['name']
        self.roles = user_data['roles']
        self.password = user_data['password']


class CamelAuth(object):

    @staticmethod
    def getCurrentUser():
        if 'AuthUser' in g.__dict__:
            return g.AuthUser
        user_id = session.get('AuthUser_user_id', None)
        user = None
        if user_id != None:
            user = User(config['auth'][user_id])
        if session.get('AuthUser_logged_in','0') == 1 and type(user) is User:
            g.AuthUser = user
            pass
        else:
            g.AuthUser = None
        return g.AuthUser

    @staticmethod
    def isLoggedIn():
        return CamelAuth.getCurrentUser() is not None

    @staticmethod
    def login(user_id, password):
        user = None
        try:
            user = User(config['auth'][user_id])
        except Exception as e:
            pass

        if type(user) is not User:
            return False

        if user.password != password:
            return False

        session['AuthUser_logged_in'] = 1
        session['AuthUser_user_id'] = user.id
        session.permanent = True
        return True

    @staticmethod
    def logout():
        session['AuthUser_logged_in'] = 0
        session.pop('AuthUser_user_id', None)


@app.context_processor
def inject_auth_data():
    logged_in = False
    user = CamelAuth.getCurrentUser()
    if user is not None:
        logged_in = True
    return dict(user=user, logged_in=logged_in)


def _forceLogin():
    session['next_url'] = request.url
    return redirect(url_for('account.login'))


def requireLoggedIn(f):

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if CamelAuth.isLoggedIn():
            return f(*args, **kwargs)
        return _forceLogin()

    return decorated_function


def requireLoggedInRole(role):
    def decorator(f):

        @requireLoggedIn
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = CamelAuth.getCurrentUser()
            if role in user.roles:
                return f(*args, **kwargs)
            return _forceLogin()

        return decorated_function
    return decorator


def _apiLogin():
    return Response(
        json.dumps({'error': 'Authorization Required'}),
        401,
        {'WWW-Authenticate': 'Basic realm="Login Required"'}
        )


def requireApiAuth(f):
    """This has to work for existing sessions as well as for inline basic auth."""

    @wraps(f)
    def decorated_function(*args, **kwargs):

        auth = request.authorization
        if auth:
            CamelAuth.login(auth.username, auth.password)
        if CamelAuth.isLoggedIn():
            return f(*args, **kwargs)
        return _apiLogin()

    return decorated_function


def requireApiRole(role):
    def decorator(f):

        @wraps(f)
        @requireApiAuth
        def decorated_function(*args, **kwargs):

            user = CamelAuth.getCurrentUser()
            if role in user.roles:
                return f(*args, **kwargs)
            return _apiLogin()

        return decorated_function
    return decorator
