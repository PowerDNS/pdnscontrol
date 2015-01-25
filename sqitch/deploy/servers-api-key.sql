-- Deploy servers-api-key

BEGIN;

ALTER TABLE servers ADD COLUMN api_key VARCHAR(255);

COMMIT;
