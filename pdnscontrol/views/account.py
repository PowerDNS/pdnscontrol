from flask import Blueprint, render_template, request, url_for, redirect, session, g, make_response

from pdnscontrol.auth import CamelAuth, requireLoggedIn

mod = Blueprint('account', __name__)


@mod.route('/')
@requireLoggedIn
def index():
    return render_template('/account/index.html', user=CamelAuth.getCurrentUser())


@mod.route('/login', methods=['GET','POST'])
def login():
    error = False
    next = session.pop('next_url', request.url_root)

    if request.method == 'POST':
        user_id = request.form.get('username')
        password = request.form.get('password')

        error = not CamelAuth.login(user_id, password)
        if not error:
            return redirect(next)

    return render_template('/account/login.html', next=next, error=error)


@mod.route('/logout')
def logout():
    CamelAuth.logout()
    return render_template('/account/logout.html')
