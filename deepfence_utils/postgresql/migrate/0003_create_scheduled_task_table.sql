-- +goose Up

-- +goose StatementBegin
CREATE TABLE scheduler
(
    id          BIGSERIAL PRIMARY KEY,
    action      character varying(64)                              NOT NULL,
    description character varying(1024)                            NOT NULL,
    cron_expr   character varying(64)                              NOT NULL,
    payload     jsonb                                              NOT NULL,
    is_enabled  boolean                                            NOT NULL,
    is_system   boolean                                            NOT NULL,
    status      character varying(1024)                            NOT NULL,
    last_ran_at timestamp with time zone,
    created_at  timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at  timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER scheduler_updated_at
    BEFORE UPDATE
    ON scheduler
    FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();
-- +goose StatementEnd

-- +goose Down

-- +goose StatementBegin
DROP TABLE IF EXISTS scheduler;
-- +goose StatementEnd
