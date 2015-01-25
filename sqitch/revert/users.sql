-- Revert users

BEGIN;

DROP TABLE "users_userroles";
DROP TABLE "users";
DROP TABLE "userroles";

COMMIT;
