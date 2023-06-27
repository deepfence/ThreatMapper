START TRANSACTION;

INSERT INTO role (name) VALUES ('admin') ON CONFLICT (name) DO NOTHING;
INSERT INTO role (name) VALUES ('standard-user') ON CONFLICT (name) DO NOTHING;
INSERT INTO role (name) VALUES ('read-only-user') ON CONFLICT (name) DO NOTHING;

COMMIT;
