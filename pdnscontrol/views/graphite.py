from flask import Blueprint, request, make_response, current_app
from flask.ext.security import roles_required
from datetime import datetime, timedelta
from werkzeug.http import http_date

from pdnscontrol.utils import fetch_remote, api_auth_required


mod = Blueprint('graphite', __name__)


@mod.route('/render/', methods=['GET'])
@api_auth_required
@roles_required('stats')
def graphite():
    params = dict((k,request.values.getlist(k)) for k in request.values.keys())
    try:
        response = fetch_remote(
            current_app.config['GRAPHITE_SERVER'],
            method=request.method,
            data=request.data,
            accept=request.headers.get('Accept'),
            params=params,
            timeout=current_app.config['GRAPHITE_TIMEOUT']
        )
        headers = {'Content-Type': response.headers.get('Content-Type')}
        cache_for = int(request.values.get('_cache', 0))
        if cache_for > 0:
            headers['Cache-Control'] = 'private, max-age=' + str(cache_for)
            headers['Expires'] = http_date(datetime.now() + timedelta(seconds=cache_for))
        return make_response((
            response.content,
            response.status_code,
            headers
        ))
    except Exception as e:
        width = request.values.get('width', '400')
        height = request.values.get('height', '200')
        image_tpl = """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 {width} {height}" width="{width}" height="{height}">
    <text x="10" y="20" fill="red" font-size="15">
        {error}
    </text>
</svg>"""
        image = image_tpl.format(**{
            'error': str(e),
            'width': width,
            'height': height
        })
        return make_response((
            image,
            500,
            {'Content-Type': 'image/svg+xml'}
        ))
