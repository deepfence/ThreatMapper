START TRANSACTION;

DELETE FROM role WHERE name = 'admin';
DELETE FROM role WHERE name = 'standard-user';
DELETE FROM role WHERE name = 'read-only-user';

COMMIT;