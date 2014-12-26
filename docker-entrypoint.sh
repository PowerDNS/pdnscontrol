#!/bin/bash
set -e
if [ "$1" = 'debug' ]; then
    su -c '/usr/sbin/pdns_server --config-dir=/opt/pdnscontrol/instance --daemon' pdnscontrol
    echo 'Starting pdnscontrol on port 5000 ...'
    su -c 'cd /opt/pdnscontrol && python ./debug.py' pdnscontrol
fi

exec "$@"
