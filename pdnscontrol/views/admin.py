from flask import Blueprint, render_template, request, url_for, redirect, session, g, make_response

mod = Blueprint('admin', __name__)

