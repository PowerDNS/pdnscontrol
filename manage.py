from flask.ext.script import Manager
from flask.ext.assets import ManageAssets
from pdnscontrol import app, asset_env

manager = Manager(app)
manager.add_command("assets", ManageAssets(asset_env))

if __name__ == "__main__":
    manager.run()

