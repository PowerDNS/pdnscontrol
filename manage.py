#!/usr/bin/env python
from flask.ext.script import Manager
from flask.ext.assets import ManageAssets
from pdnscontrol import app, asset_env
from pdnscontrol.manage import ManageResetPassword

manager = Manager(app)
manager.add_command("assets", ManageAssets(asset_env))
manager.add_command("reset-password", ManageResetPassword())

if __name__ == "__main__":
    manager.run()
