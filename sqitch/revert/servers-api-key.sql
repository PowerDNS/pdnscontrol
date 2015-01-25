-- Revert servers-api-key

BEGIN;

ALTER TABLE servers DROP COLUMN api_key;

COMMIT;
