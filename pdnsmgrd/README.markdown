# pdnsmgrd

## Quickstart

    apt-get install python ssl-cert
    mkdir /etc/powerdns
    cp /etc/ssl/private/ssl-cert-snakeoil.key /etc/powerdns/pdnsmgrd-ssl.key
    cp /etc/ssl/certs/ssl-cert-snakeoil.pem /etc/powerdns/pdnsmgrd-ssl.pem
    cp pdnsmgrd.conf.example /etc/powerdns/pdnsmgrd.conf
    editor /etc/powerdns/pdnsmgrd.conf
    groupadd -r pdnsmgrd
    useradd -r -g pdnsmgrd pdnsmgrd
    ./pdnsmgrd


## Features

 * SSL
 * Static Authentication (HTTP Basic Auth)
 * Install/Upgrade pdns packages
 * Start/Stop/Restart pdns daemons
 * Relay to pdns webservers

## Configuration

`pdnsmgrd` looks for it's configuration file `pdnsmgrd.conf` in `/etc/powerdns` by default (change this using
`--config-dir`).

If you are running PowerDNS Authoritative Server and PowerDNS Recursor on the same machine and
want a `pdnsmgrd` instance for each, it is suggested you use `--config-name=auth` and `--config-name=recursor`
respectively.

## Supported URLs

### /manage/<action>

Manage the pdns daemon or package.

#### Parameters

 * **action**: _start_, _stop_, _restart_, _install_, _upgrade_
 * For action=install and action=upgrade: **version** - the version to install/upgrade (_optional_)
 * **\_callback**: _optional_, turns response into JSONP instead of JSON
 
POST with `application/x-www-form-urlencoded`. Result will be JSON or JSONP (see **\_callback** parameter).

#### Example

    curl -d '' -k -u 'secret:sikrit' 'https://localhost:8084/manage/restart'
    {"cmdline": ["sudo", "service", "pdns", "restart"], "success": true, "output": "Restarting pdns (via systemctl): pdns.service.\n"}


### /server/localhost/$subpath

Relay `$subpath` to configured upstream.

Any method supported by the upstream server. Result format will be determined by upstream server.

#### Example

    curl -X POST -k -u 'secret:sikrit' https://localhost:8084/server/localhost/
    {"aaaa-additional-processing": "off"
    , "additional-processing": "off"
    , "allow-from": "127.0.0.0/8, 10.0.0.0/8, 192.168.0.0/16, 172.16.0.0/12, ::1/128, fe80::/10"
    ...
    }

## sudo configuration Example

    pdnsmgrd ALL = NOPASSWD: /usr/sbin/service pdns restart
    pdnsmgrd ALL = NOPASSWD: /usr/sbin/service pdns-recursor restart
    pdnsmgrd ALL = NOPASSWD: /usr/sbin/service pdns stop
    pdnsmgrd ALL = NOPASSWD: /usr/sbin/service pdns-recursor stop
    pdnsmgrd ALL = NOPASSWD: /usr/sbin/service pdns start
    pdnsmgrd ALL = NOPASSWD: /usr/sbin/service pdns-recursor start
