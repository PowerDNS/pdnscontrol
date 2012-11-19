#!/usr/bin/env python
# Jan-Piet Mens <jpmens(at)gmail.com>

import sys
import os
import requests
import json
import time
import socket


auth = [ 'udp-queries', 'udp-answers']
recursor = [    # http://doc.powerdns.com/recursor-stats.html
		"all-outqueries",
		"answers0-1",
		"answers100-1000",
		"answers10-100",
		"answers1-10",
		"answers-slow",
		"cache-bytes",
		"cache-entries",
		"cache-hits",
		"cache-misses",
		"chain-resends",
		"client-parse-errors",
		"concurrent-queries",
		"dlg-only-drops",
		"dont-outqueries",
		"ipv6-outqueries",
		"max-mthread-stack",
		"negcache-entries",
		"noerror-answers",
		"nsspeeds-entries",
		"nsset-invalidations",
		"nxdomain-answers",
		"outgoing-timeouts",
		"over-capacity-drops",
		"packetcache-bytes",
		"packetcache-entries",
		"packetcache-hits",
		"packetcache-misses",
		"qa-latency",
		"questions",
		"resource-limits",
		"server-parse-errors",
		"servfail-answers",
		"spoof-prevents",
		"sys-msec",
		"tcp-client-overflow",
		"tcp-outqueries",
		"tcp-questions",
		"throttled-out",
		"throttle-entries",
		"unauthorized-tcp",
		"unauthorized-udp",
		"unexpected-packets",
		"uptime",
		"user-msec"
   ]

CARBONSERVER = '127.0.0.1'
CARBONPORT = 2003
DELAY = 15  #seconds

def send_it(message):

    try:
        sock = socket.socket()
        sock.connect((CARBONSERVER, CARBONPORT))
        sock.sendall(message)
        sock.close()
    except socket.error:
        print "Can't connect to Carbon server at %s:%s" % (CARBONSERVER, CARBONPORT)
        sys.exit(1)
    except:
        pass

def nowtics():
    return int(time.time())

def getserverlist(serverlist_url):

    r = requests.get(serverlist_url)
    s = json.loads(r.text)
    return s

def graph_server(url, type, keys, node):

    print "--------- %-10s %-20s %s" % (type, node, url)
    node = node.replace('.', '-')

    r = requests.get(url)
    stats = json.loads(r.text)

    timestamp = nowtics()
    lines = []

    for s in statlist:
        if s in stats:
            lines.append("pdns.%s.%s.%s %s %d" % (node, type, s, stats[s], timestamp))

    message = '\n'.join(lines) + '\n'
    print message
    send_it(message)

if __name__ == '__main__':

    if len(sys.argv) < 2:
        sys.exit("Usage: %s serverlist.json" % sys.argv[0])

    serverlist_url = sys.argv[1]

    while True:

        for server in getserverlist(serverlist_url):
            url = server['url']
            if 'type' in server:
                if server['type'] == 'Authoritative':
                    statlist = auth
                    type = 'auth'
                    url = url + "/jsonstat?command=get"
                else:
                    statlist = recursor
                    type = 'recursor'
                    url = url + "/stats"
            graph_server(url, type, statlist, server['name'])
        time.sleep(DELAY)

