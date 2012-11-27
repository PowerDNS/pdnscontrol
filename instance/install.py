#!/usr/bin/env python
import sys
sys.path.insert(0, '..')

from pdnscontrol.models import *
db.create_all()
print "The database has been created."

if db.session.query(User).first() != None:
    print "The database has been set up already."
    sys.exit(1)

role_edit = UserRole(u'edit')
db.session.add(role_edit)
role_stats = UserRole(u'stats')
db.session.add(role_stats)
role_view = UserRole(u'view')
db.session.add(role_view)

admin_password = u'changeme'
admin = User(u'admin', u'The Admin')
admin.set_password(admin_password)
admin.roles.append(role_edit)
admin.roles.append(role_stats)
admin.roles.append(role_view)
db.session.add(admin)

graphite_password = u'notsecure'
graphite = User(u'graphite', u'Stats Fetcher')
graphite.set_password(graphite_password)
graphite.roles.append(role_stats)
db.session.add(graphite)

db.session.commit()

print "The admin user has been created. Log in as \"{admin.login}\" with password \"{admin_password}\".".format(**locals())
print "The graphite user has been created, with password \"{graphite_password}\".".format(**locals())

