-- Deploy users

BEGIN;

CREATE TABLE users (
  id INTEGER NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  active BOOLEAN,
  password VARCHAR(255),
  confirmed_at DATETIME,
  last_login_at DATETIME,
  current_login_at DATETIME,
  last_login_ip VARCHAR(64),
  current_login_ip VARCHAR(64),
  login_count INTEGER,
  PRIMARY KEY (id),
  CHECK (active IN (0, 1))
);

CREATE TABLE userroles (
  id INTEGER NOT NULL,
  name VARCHAR(255),
  description VARCHAR(255),
  PRIMARY KEY (id),
  UNIQUE (name)
);
INSERT INTO "userroles" VALUES(1,'admin',NULL);
INSERT INTO "userroles" VALUES(2,'edit',NULL);
INSERT INTO "userroles" VALUES(3,'stats',NULL);
INSERT INTO "userroles" VALUES(4,'view',NULL);
INSERT INTO "userroles" VALUES(5,'edit-users',NULL);
INSERT INTO "userroles" VALUES(6,'view-users',NULL);

CREATE TABLE users_userroles (
  user_id INTEGER,
  userrole_id INTEGER,
  FOREIGN KEY(user_id) REFERENCES users (id),
  FOREIGN KEY(userrole_id) REFERENCES userroles (id)
);

COMMIT;
