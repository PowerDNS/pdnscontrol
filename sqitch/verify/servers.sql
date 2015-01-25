-- Verify servers

BEGIN;

SELECT
  id,
  name,
  daemon_type,
  stats_url,
  manager_url
FROM servers
WHERE false;

ROLLBACK;
