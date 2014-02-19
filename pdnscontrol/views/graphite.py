from flask import Blueprint, request, make_response, current_app
from flask.ext.security import roles_required

from pdnscontrol.utils import fetch_remote, api_auth_required


mod = Blueprint('graphite', __name__)

@mod.route('/render/', methods=['GET'])
@api_auth_required
@roles_required('stats')
def graphite():
    params = dict((k,request.values.getlist(k)) for k in request.values.keys())
    response = fetch_remote(
        current_app.config['GRAPHITE_SERVER'],
        method=request.method,
        data=request.data,
        accept=request.headers.get('Accept'),
        params=params
    )
    return make_response((
        response.content,
        response.status_code,
        {'Content-Type': response.headers.get('Content-Type')}
    ))
