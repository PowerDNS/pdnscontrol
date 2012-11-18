"""
wsgissl.py

Extensions to wsgiref for HTTPS operation.

Written and released to the public domain in 2008 by Forest Wilkinson.
"""

import ssl
from wsgiref.simple_server import WSGIServer, WSGIRequestHandler


class HTTPSMixIn:
    """A MixIn class for adding SSL to BaseHTTPServer.HTTPServer subclasses.
    This works with wsgiref.WSGIServer.
    """
    def set_credentials( self, keypath=None, certpath=None):
        self.keypath = keypath
        self.certpath = certpath

    def finish_request(self, request, client_address):
        """Negotiates SSL and then mimics BaseServer behavior.
        """
        # Note: accessing self.* from here might not be thread-safe,
        # which could be an issue when using ThreadingMixIn.
        # In practice, the GIL probably prevents any trouble with read access.
        ssock = ssl.wrap_socket( request,
            keyfile=self.keypath, certfile=self.certpath, server_side=True)
        self.RequestHandlerClass(ssock, client_address, self)
        ssock.close()


class SecureWSGIServer(HTTPSMixIn, WSGIServer):
    pass


class SecureWSGIRequestHandler( WSGIRequestHandler):
    """An SSL-aware WSGIRequestHandler, which sets HTTPS environment variables.
    """
    #xxx todo: set SSL_PROTOCOL, maybe others
    def get_environ( self):
        env = WSGIRequestHandler.get_environ( self)
        if isinstance( self.request, ssl.SSLSocket):
            env['HTTPS'] = 'on'
        return env


# ======================================================================
# EOF
