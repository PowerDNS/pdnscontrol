# pdns2graphite

## Usage

    pdns2graphite serverlist.json [carbonserver port [interval]]

## Description

pdns2graphite is a small utility which periodically reads a JSON list of
servers from a URL and retrieves statistics from those PowerDNS servers
(authoritative & recursors) to feed to Graphite's Carbon process. 

The list is expected in the following format:

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
statistics from the name servers) is currently hard-coded into the program as
well. FIXME.

The `url` in the above JSON object is expected to return valid JSON out of
which stats are read and pushed to Carbon (via the specified TCP port to the
specified Carbon host -- default: `127.0.0.1:2003`) in a single message.


## Todo

* Better error-handling
* syslog support

## Authors

Peter van Dijk & JP Mens
