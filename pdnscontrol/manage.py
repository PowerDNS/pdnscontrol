from flask.ext.script import Command, prompt_pass, Option
from pdnscontrol import app
from pdnscontrol.models import *
from flask.ext.security.utils import encrypt_password

class ManageResetPassword(Command):
    "Reset the password of any user"

    option_list = (
        Option('email', help='E-Mail of the user to reset the password'),
    )

    def run(self, email):
        u = user_datastore.find_user(email=email)
        password = prompt_pass("New password for \"%s\"" % u.email)
        password2 = prompt_pass("New password (repeat)")
        if password != password2:
            print "Passwords do not match."
            return 1
        u.password = encrypt_password(password)
        db.session.add(u)
        db.session.commit()
        print "Password updated."
        return 0

