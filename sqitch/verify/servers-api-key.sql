-- Verify servers-api-key

BEGIN;

SELECT api_key FROM servers WHERE false;

ROLLBACK;
