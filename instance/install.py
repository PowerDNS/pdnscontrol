#!/usr/bin/env python
import sys
sys.path.insert(0, '..')

from pdnscontrol.models import *
db.create_all()
print "The database has been created."

if user_datastore.find_role(u'admin') is not None:
    print "The database has been set up already."
    if sys.argv[-1] == '--existing-ok':
        sys.exit(0)
    else:
        sys.exit(1)

role_admin = user_datastore.find_or_create_role(name=u'admin')
role_edit = user_datastore.find_or_create_role(name=u'edit')
role_stats = user_datastore.find_or_create_role(name=u'stats')
role_view = user_datastore.find_or_create_role(name=u'view')
role_edit_users = user_datastore.find_or_create_role(name=u'edit-users')
role_view_users = user_datastore.find_or_create_role(name=u'view-users')

admin_password = u'changeme'
admin_email = u'admin@example.org'
admin = user_datastore.create_user(email=admin_email, name=u'The Admin', password=admin_password)
user_datastore.add_role_to_user(admin, role_admin)
user_datastore.add_role_to_user(admin, role_stats)
user_datastore.add_role_to_user(admin, role_edit)
user_datastore.add_role_to_user(admin, role_view)
user_datastore.add_role_to_user(admin, role_edit_users)
user_datastore.add_role_to_user(admin, role_view_users)

graphite_password = u'notsecure'
graphite = user_datastore.create_user(email=u'graphite@example.org', name=u'Stats Fetcher', password=graphite_password)
user_datastore.add_role_to_user(graphite, role_stats)

db.session.commit()


print "The admin user has been created. Log in as \"{admin_email}\" with password \"{admin_password}\".".format(**locals())
print "The graphite user has been created, with password \"{graphite_password}\".".format(**locals())
