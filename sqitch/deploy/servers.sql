-- Deploy servers

BEGIN;

CREATE TABLE servers (
  id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  daemon_type VARCHAR(255),
  stats_url VARCHAR(255),
  manager_url VARCHAR(255),
  PRIMARY KEY (id),
  UNIQUE (name)
);

COMMIT;
