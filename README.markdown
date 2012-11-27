# Camel

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
* PowerDNS Authoritative 3.2-pre (svn 2905+)
* PowerDNS Recursor 3.5-pre (svn 2905+)
* Graphite
* PostgreSQL 8.3 or newer database
* Cron

## Components

### Camel Web Frontend

Flask-based web app.

#### Installing the frontend

    easy_install pbundler
    pbundle

or

    virtualenv venv-pdnscontrol
    . ./venv-pdnscontrol/bin/activate
    pip install -r requirements.txt

#### Configuration

    cp instance/pdnscontrol.conf.example instance/pdnscontrol.conf
    editor instance/pdnscontrol.conf
    cd instance && python install.py


#### Running (Debug mode)

    pbundle-py debug.py

or

    . ./venv-pdnscontrol/bin/activate
    python debug.py


### Graphite data feeder

Feeds PowerDNS stats into your Graphite installation.

Lives in `pdns2graphite`. Look at pdns2graphite/README.markdown for documentation.


### Daemon manager

Runs system-wide commands that affect the pdns binaries/processes.
Also proxies the PowerDNS JSON interface for consumption over SSL.

Lives in `pdnsmgrd`. Look at pdnsmgrd/README.markdown for documentation.


## Tested platforms

The current code is known to run on these platforms:

* Debian squeeze (Python 2.6)
* Debian sid (Python 2.7)
* Ubuntu Lucid Lynx (Python 2.6)
