# This Dockerfile is for development/evaluation purposes only (insecure config, hardcoded secrets).
# Example usage:
#     docker build -t pdnscontrol . && docker run -p 5301:5301 -p 8081:8081 -p 5000:5000 --name pdnscontrol pdnscontrol
#
# Default email/password for pdnscontrol: admin@example.org/changeme
#
# Ports:
# 5000: pdnscontrol web
# 5301: Auth. DNS
# 8081: Auth. DNS Web & API

FROM debian:testing

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get -y install \
        libpq-dev libmysqlclient-dev \
        python-virtualenv python-dev python-pip python-flask python-sqlalchemy python-psycopg2 python-mysqldb python-blinker python-passlib python-requests \
        sqlite3 build-essential libpython-dev graphite-carbon graphite-web gunicorn && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt && \
    useradd -d /opt/pdnscontrol -m --system pdnscontrol

USER _graphite
RUN graphite-manage syncdb --noinput
USER root

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get -y install pdns-server pdns-backend-sqlite3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /opt/pdnscontrol
COPY requirements-flexible.txt /opt/pdnscontrol/
RUN pip install -r requirements-flexible.txt
COPY . /opt/pdnscontrol

#VOLUME /opt/pdnscontrol/instance
RUN mkdir -p /opt/pdnscontrol/instance && chown -R pdnscontrol: /opt/pdnscontrol/
WORKDIR /opt/pdnscontrol/instance

USER pdnscontrol

# Configure PowerDNS Auth.
RUN set -x && \
    echo "# generated by dockerfile" > pdns.conf && \
    echo "socket-dir=/opt/pdnscontrol/instance" >> pdns.conf && \
    echo "launch=gsqlite3" >> pdns.conf && \
    echo "gsqlite3-database=/opt/pdnscontrol/instance/pdns.sqlite3" >> pdns.conf && \
    echo "local-address=0.0.0.0" >> pdns.conf && \
    echo "local-port=5301" >> pdns.conf && \
    echo "webserver=yes" >> pdns.conf && \
    echo "webserver-address=0.0.0.0" >> pdns.conf && \
    echo "webserver-password=changeme" >> pdns.conf && \
    echo "webserver-port=8081" >> pdns.conf && \
    echo "experimental-api-key=apikey123456" >> pdns.conf && \
    echo "experimental-json-interface=yes" >> pdns.conf && \
    true && cat pdns.conf

# Import empty PowerDNS Auth. database
RUN set -x && if [ ! -f pdns.sqlite3 ]; then \
    sqlite3 -bail -batch pdns.sqlite3 ".read /usr/share/doc/pdns-backend-sqlite3/schema.sqlite3.sql"; \
    fi

# Configure pdnscontrol and initialize it's database
RUN set -x && if [ ! -f pdnscontrol.conf ]; then \
    echo "# generated by dockerfile" > pdnscontrol.conf && \
    echo "DATABASE_URI='sqlite:////opt/pdnscontrol/instance/pdnscontrol.sqlite'" >> pdnscontrol.conf && \
    echo "SECRET_KEY='notsecret'" >> pdnscontrol.conf && \
    echo "DEBUG = True" >> pdnscontrol.conf && \
    echo "SECURITY_PASSWORD_SALT = 'for-evaluation-only'" >> pdnscontrol.conf && \
    echo "IGNORE_SSL_ERRORS = True" >> pdnscontrol.conf ; \
    fi && cat pdnscontrol.conf && python ../install.py

USER root

EXPOSE 5000 5301 8081
ENTRYPOINT ["/opt/pdnscontrol/docker-entrypoint.sh"]
CMD ["debug"]

