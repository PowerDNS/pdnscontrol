-- Verify users

BEGIN;

SELECT
  id,
  email,
  name,
  active,
  password,
  confirmed_at,
  last_login_at,
  current_login_at,
  last_login_ip,
  current_login_ip,
  login_count
FROM "users"
WHERE false;

SELECT
  id,
  name,
  description
FROM "userroles"
WHERE false;

SELECT
  user_id,
  userrole_id
FROM users_userroles
WHERE false;

ROLLBACK;
