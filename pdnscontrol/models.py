from flask import Flask, request
from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext.security import SQLAlchemyUserDatastore, UserMixin, RoleMixin
import datetime
import urlparse

from pdnscontrol import app
from pdnscontrol.utils import fetch_json

__all__ = ['db', 'Server', 'user_datastore']

db = SQLAlchemy(app)

# Table Names:
#   lowercase of the model name, NO underscores
#   association tables: lowercase, referenced model names joined together with
#       underscores, sorted by the definition in the association table.


class IterableModel(object):
    def __iter__(self):
        for k,v in self.__dict__.iteritems():
            if k.startswith('_'):
                continue
            yield (k,v)


class RestModel(object):
    def to_dict(self):
        d = {'_id': getattr(self, getattr(self, '__id_mapped_to__', 'id'))}
        for fn in self.__readonly_fields__:
            d[fn] = getattr(self, fn)
        for fn in self.__public_fields__:
            d[fn] = getattr(self, fn)
        return d

    def mass_assign(self, data):
        for fn in self.__public_fields__:
            if data.has_key(fn):
                setattr(self, fn, data[fn])
        self._id = getattr(self, getattr(self, '__id_mapped_to__', 'id'))
        self.mark_validation_dirty()

    @property
    def is_valid(self):
        return (len(self.validation_errors) == 0)

    @property
    def validation_errors(self):
        if getattr(self, '_validation_errors', None) is None:
            self._validation_errors = self.validate()
        return self._validation_errors

    def mark_validation_dirty(self):
        self._validation_errors = None


class User(db.Model, UserMixin):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.Unicode(255))
    name = db.Column(db.Unicode(255))
    active = db.Column(db.Boolean())
    password = db.Column('password', db.Unicode(255))
    roles = db.relationship('UserRole', secondary='users_userroles', backref='users')
    confirmed_at = db.Column(db.DateTime())
    last_login_at = db.Column(db.DateTime())
    current_login_at = db.Column(db.DateTime())
    last_login_ip = db.Column(db.Unicode(64))
    current_login_ip = db.Column(db.Unicode(64))
    login_count = db.Column(db.Integer)

    def __repr__(self):
        return '<User %r>' % self.email


class UserRole(db.Model, RoleMixin):
    __tablename__ = "userroles"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Unicode(255), unique=True)
    description = db.Column(db.Unicode(255))


users_userroles = db.Table(
    'users_userroles',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id')),
    db.Column('userrole_id', db.Integer, db.ForeignKey('userroles.id'))
)

# Flask-Security
user_datastore = SQLAlchemyUserDatastore(db, User, UserRole)


class Server(db.Model, IterableModel, RestModel):
    __tablename__ = 'servers'
    id = db.Column(db.Integer, primary_key = True)
    name = db.Column(db.UnicodeText, nullable=False, unique=True)
    daemon_type = db.Column(db.UnicodeText)
    stats_url = db.Column(db.UnicodeText)
    manager_url = db.Column(db.UnicodeText)
    __public_fields__ = ['name', 'daemon_type', 'stats_url', 'manager_url']
    __readonly_fields__ = []
    __id_mapped_to__ = 'name'

    def validate(self):
        errors = {}
        for fn in ['name', 'daemon_type', 'stats_url', 'manager_url']:
            if getattr(self, fn) in ['', None]:
                errors[fn] = '%s must be set'
        for fn in ['stats_url', 'manager_url']:
            if errors.get(fn):
                continue
            if not getattr(self, fn).startswith('http'):
                errors[fn] = '%s must be a valid URL'
        return errors

    @staticmethod
    def all():
        servers = []
        for obj in Server.query.all():
            server = obj.to_dict()
            servers.append(server)
        return servers

    def to_dict(self):
        d = super(Server, self).to_dict()
        d['stats'] = self.sideload('stats')
        d['config'] = self.sideload('config')
        d['url'] = request.url_root + 'api/servers/' + self.name + '/'
        return d

    def sideload(self, what):
        remote_action = what
        if self.daemon_type == 'Authoritative':
            if what == 'stats':
                remote_action = 'get'
            elif what == 'config':
                remote_action = 'config'
        remote_url = urlparse.urljoin(self.pdns_url, '?command=' + remote_action)

        try:
            data = fetch_json(remote_url)
            return data
        except:
            return None

    @property
    def pdns_url(self):
        remote_url = self.stats_url
        if remote_url is None or remote_url == '':
            return None
        if self.daemon_type == 'Authoritative':
            if remote_url[-1] != '/':
                remote_url = remote_url + '/'
            remote_url = remote_url + 'jsonstat'
        return remote_url
