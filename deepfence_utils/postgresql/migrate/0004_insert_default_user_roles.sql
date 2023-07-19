-- +goose Up

-- +goose StatementBegin
INSERT INTO role (name) VALUES ('admin') ON CONFLICT (name) DO NOTHING;
INSERT INTO role (name) VALUES ('standard-user') ON CONFLICT (name) DO NOTHING;
INSERT INTO role (name) VALUES ('read-only-user') ON CONFLICT (name) DO NOTHING;
-- +goose StatementEnd

-- +goose Down

-- +goose StatementBegin
DELETE FROM role WHERE name = 'admin';
DELETE FROM role WHERE name = 'standard-user';
DELETE FROM role WHERE name = 'read-only-user';
-- +goose StatementEnd
