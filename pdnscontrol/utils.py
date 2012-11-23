from flask import request, current_app
import json

from pdnscontrol import app

def jsonpify(*args, **kwargs):
    callback = request.args['callback']
    data = json.dumps(dict(*args, **kwargs), indent=None)
    content = str(callback) + '(' + data + ')'
    mimetype = 'application/javascript'
    return current_app.response_class(content, mimetype=mimetype)


@app.context_processor
def inject_config():
    return dict(config=current_app.config)
