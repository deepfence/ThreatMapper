-- +goose Up

-- +goose StatementBegin
ALTER TABLE integration ADD COLUMN last_event_updated_at timestamp with time zone NULL;
ALTER TABLE integration ADD COLUMN metrics jsonb NOT NULL default '{}';
-- +goose StatementEnd

-- +goose Down

-- +goose StatementBegin
ALTER TABLE integration DROP COLUMN IF EXISTS last_event_updated_at;
ALTER TABLE integration DROP COLUMN IF EXISTS metrics;
-- +goose StatementEnd