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
* View zone contents

## Requirements

* Python 2.6 or Python 2.7
* PowerDNS Authoritative 3.4-pre
* PowerDNS Recursor 3.6-pre
* Graphite
* PostgreSQL 8.3 or newer, or MySQL 5.5 or newer
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
* We provide a Flask-based webapp through which you can query, manipulate and configure your PowerDNS instances 
  through the JSON interface
* A separate program, pdnsmgrd, can stop, start and restart your PowerDNS instances remotely
* A separate program, pdns2graphite, stores all metrics in graphite. The webapp meanwhile refers to graphite graphs
  in its user interface
* pdns2graphite can query the webapp for configuration details

### PowerDNS Web Frontend

Flask-based web app.

#### Installing the frontend

Make sure you have MySQL and PostgreSQL development libraries available, possibly like this:

    sudo apt-get install libpq-dev libmysqlclient-dev

If you want sqlite support, add pysqlite to requirements.txt and then:

    virtualenv venv-pdnscontrol
    . ./venv-pdnscontrol/bin/activate
    pip install -r requirements.txt

Note that the middle 'activate' command creates a special working environment, which must remain active for
the 'pip install' and the 'python install.py' below!

#### Configuration

    cp instance/pdnscontrol.conf.example instance/pdnscontrol.conf
    editor instance/pdnscontrol.conf
    cd instance && python install.py


#### Running (Debug mode)

    . ./venv-pdnscontrol/bin/activate
    python debug.py

Don't forget to enable the webserver and API features on your PowerDNS installations (experimental-webserver, experimental-webserver-address, experimental-webserver-password, experimental-json-interface for Recursor, experimental-json-interface and webserver-address for Authoritative). The 'experimental-' prefix denotes that the API might still change, but if it does, pdnscontrol will change with it.

#### Developing

To update built templates, you also need to have other software installed.
See pdnscontrol/README.md for details.

### Graphite data feeder

Feeds PowerDNS stats into your Graphite installation.

Lives in `pdns2graphite`. Look at pdns2graphite/README.markdown for documentation.


### Daemon manager

Runs system-wide commands that affect the pdns binaries/processes.
Also proxies the PowerDNS JSON interface for consumption over SSL.

Lives in `pdnsmgrd`. Look at pdnsmgrd/README.markdown for documentation.


## Tested platforms

The current code is known to run on these platforms:

* CentOS 6 (Python 2.7)
* Debian wheezy (Python 2.7)

