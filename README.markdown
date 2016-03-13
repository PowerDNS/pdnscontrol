This project currently receives very little active development and the master version is not in sync with the API changes in PowerDNS 4.0.0. If you're running PowerDNS 3.4.x with the experimental-api, you could possibly use the tag "last-3x-compat" for the time being.

# PowerDNS Web Control Panel

PowerDNS Web Control Panel

Features:
* Get aggregate statistics of all PowerDNS instances, split out by authoritative and recursive servers
* Centrally & individually purge caches of possibly outdated data
* Centrally & individually search log files for troubleshooting purposes
* Monitor patch levels of all servers
* Centrally & individually deploy versions of the software
* Centrally & individually start, restart and stop instances
* View configuration details
* View and edit zone contents

## Requirements

* Python 2.7
* PowerDNS Authoritative 4.0.0-alpha2
* PowerDNS Recursor 4.0.0-alpha2
* Graphite
* PostgreSQL 9.2 or newer, or MySQL 5.5 or newer, or SQLite 3
* Cron

### Browser requirements

* Chrome 33+
* Firefox 24.3+
* Internet Explorer 9+
* Safari 7+

## Components

How it all hangs together:

* PowerDNS Authoritative Server and PowerDNS Recursor both publish data, and accept commands, via a
  JSON-powered, RESTful interface. This interface is not specific to 'pdnscontrol', and can be used
  by everyone. Commands allow for full zone editing, removal etc.
* The PowerDNS Authoritative Server and PowerDNS Recursor feed data to graphite using the carbon protocol.
  The webapp meanwhile refers to graphite graphs in its user interface
* We provide a Flask-based webapp through which you can query, manipulate and configure your PowerDNS instances 
  through the JSON interface
* A separate program, pdnsmgrd, can stop, start and restart your PowerDNS instances remotely. It can also proxy API requests to multiple servers, and provides SSL encryption

### PowerDNS Web Frontend

Flask-based web app.

#### Installing the frontend

Make sure you have MySQL, PostgreSQL and Python development libraries available, possibly like this:

    sudo apt-get install libpq-dev libmysqlclient-dev python-dev build-essential virtualenv

(SQLite drivers come with Python, so there's no extra library to install.)

Then:

    virtualenv venv-pdnscontrol
    . ./venv-pdnscontrol/bin/activate
    pip install -r requirements.txt

Note that the middle 'activate' command creates a special working environment, which must remain active for
the 'pip install' and the 'python install.py' below!

#### Configuration

    # reenter virtualenv if needed:
    . ./venv-pdnscontrol/bin/activate
    cp instance/pdnscontrol.conf.example instance/pdnscontrol.conf
    editor instance/pdnscontrol.conf
    python install.py


#### Running (Debug mode)

    . ./venv-pdnscontrol/bin/activate
    python debug.py

Don't forget to enable the webserver and API features on your PowerDNS installations (experimental-webserver, experimental-webserver-address, experimental-webserver-password, experimental-json-interface for Recursor, experimental-json-interface and webserver-address for Authoritative). The 'experimental-' prefix denotes that the API might still change, but if it does, pdnscontrol will change with it.

#### Running (Production mode)

We recommend using gunicorn and nginx or Apache as a reverse proxy.

Example gunicorn command line (assuming you've installed pdnscontrol into `/opt/pdnscontrol` and a dedicated system user named `pdnscontrol` has been created):

```
/opt/pdnscontrol/pdnscontrol/venv-pdnscontrol/bin/gunicorn --chdir /opt/pdnscontrol/pdnscontrol/ -u pdnscontrol -w 5 -b :8000 --log-level debug  --error-logfile /dev/stderr pdnscontrol:app
```

#### Running under uWSGI + nginx

User-contributed documentation about running pdnscontrol under uWSGI + nginx. (We recommend using gunicorn + nginx or Apache for production deployments.)

uWSGI Sample configuration:

```ini
[uwsgi]
plugins = python27
virtualenv = /opt/pdnscontrol/venv-pdnscontrol
chdir = /opt/pdnscontrol
master = true
harakiri = 30
sharedarea = 4
processes = 1
socket = /run/%n.socket
uid=uwsgi
gid=uwsgi
chown-socket = nginx
#location of log files
logto = /var/log/uwsgi/%n.log
wsgi-file = /opt/pdnscontrol/instance/pdnscontrol.wsgi
```

nginx Sample configuration:

```
server {
...
   location /pdnscontrol/ {
       include uwsgi_params;
       uwsgi_pass unix:/run/pdnscontrol.socket;
       uwsgi_param UWSGI_SCHEME https;
       uwsgi_param SCRIPT_NAME /pdnscontrol;
       uwsgi_modifier1 30;
   }
}
```


#### Docker for evaluation purposes

See the instructions in `Dockerfile` on how to get a minimal Docker container with PowerDNS Authoritative Server and pdnscontrol.

#### Developing

To update built templates, you also need to have other software installed.
See pdnscontrol/README.md for details.

If you update your checkout you might, but should not, have to run:

    ./manage.py assets build

### Daemon manager

Runs system-wide commands that affect the pdns binaries/processes.
Also proxies the PowerDNS JSON interface for consumption over SSL.

Lives in `pdnsmgrd`. Look at pdnsmgrd/README.markdown for documentation.


## Tested platforms

The current code is known to run on these platforms:

* CentOS 6 (Python 2.7)
* Debian jessie (Python 2.7)

