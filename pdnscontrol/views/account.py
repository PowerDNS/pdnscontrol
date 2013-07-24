from flask import Blueprint, render_template, request, url_for, redirect, session, g, make_response

from pdnscontrol.auth import Auth, requireLoggedIn

mod = Blueprint('account', __name__)


@mod.route('/')
@requireLoggedIn
def index():
    return render_template('/account/index.html', user=Auth.getCurrentUser())


@mod.route('/login', methods=['GET','POST'])
def login():
    error = False
    next = session.pop('next_url', request.url_root)

    if request.method == 'POST':
        login = request.form.get('login')
        password = request.form.get('password')

        error = not Auth.login(login, password)
        if not error:
            return redirect(next)

    return render_template('/account/login.html', next=next, error=error)


@mod.route('/logout')
def logout():
    Auth.logout()
    return render_template('/account/logout.html')
