# mod_wsgi wsgi script file.
#
# Example mod_wsgi config:
# WSGIPythonHome /home/pdnscontrol/pdnscontrol/venv
# WSGIDaemonProcess pdnscontrol user=pdnscontrol group=pdnscontrol processes=2 threads=5
# WSGIScriptAlias /pdnscontrol /home/pdnscontrol/pdnscontrol/instance/pdnscontrol.wsgi
# <Directory /home/pdnscontrol/pdnscontrol>
# WSGIProcessGroup pdnscontrol
# WSGIApplicationGroup %{GLOBAL}
# Order deny,allow
# Allow from all
# </Directory>

import os, sys
srcdir = os.path.dirname(os.path.abspath(__file__+'/..'))
sys.path.insert(0, srcdir)
from pdnscontrol import app as application
