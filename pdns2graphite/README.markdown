# pdns2graphite

## Usage

    pdns2graphite [configfile]

## Description

pdns2graphite is a small utility which periodically reads a JSON list of
servers from a URL and retrieves statistics from those PowerDNS servers
(authoritative & recursors) to feed to Graphite's Carbon process. 

The (optional) configuration file contains Python variable assignments, and
the following configuration variables can be used to alter _pdns2graphite_'s
behavior:

```
# For pdns2graphite:

# URL of serverlist
# serverlist_url = 'http://some.place/x/y'

# Name or address of Carbon server (default: 127.0.0.1)
# carbon_server = '10.0.12.1'

# Port on which Carbon server listens (default: 2003)
# carbon_port = 2003

# Sleep between checks in seconds (default: 5)
# carbon_delay = 5

# Authentication: user & password (no defaults)
# pdnscontrol_user = 'username'
# pdnscontrol_pass = 'password'
```


The list of servers (read from `server_url`) is expected in the following format:

```json
{
  "servers": [
    {
      "url": "https://ns.example.com/control/api/server/ns.example.com/", 
      "type": "Authoritative", 
      "name": "ns.example.com"
    }, 
    {
      "url": "https://server1/control/api/server/server1.com/", 
      "type": "Recursor", 
      "name": "server1.com"
    }
  ]
}
```

Each server in the array is queried for JSON output of statistics, depending on
whether it's an authoritative or recursor server. (The list of parameters is
hardcoded into `pdns2graphite`.) Authentication information (for accessing
statistics from the name servers) is obtained from the configuration file.

The `url` in the above JSON object is expected to return valid JSON out of
which stats are read and pushed to Carbon (via the specified TCP port to the
specified Carbon host) in a single message.


## Todo

* Better error-handling
* syslog support

## Authors

Peter van Dijk & JP Mens
