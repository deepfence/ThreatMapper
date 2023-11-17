-- +goose Up

-- +goose StatementBegin
CREATE TABLE public.ai_integration
(
    id                  SERIAL PRIMARY KEY,
    integration_type    character varying(64) unique                       NOT NULL,
    --  integration_type: openai / azure-openai / amazon-bedrock, etc
    last_sent_time      timestamp with time zone                           NULL,
    config              jsonb                                              NOT NULL,
    error_msg           text                                               NULL,
    default_integration bool                     default false             NOT NULL,
    created_by_user_id  bigint                                             NOT NULL,
    created_at          timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at          timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_created_by_user_id
        FOREIGN KEY (created_by_user_id)
            REFERENCES users (id)
            ON DELETE CASCADE
);

CREATE TRIGGER ai_integration_updated_at
    BEFORE UPDATE
    ON ai_integration
    FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();
-- +goose StatementEnd

-- +goose Down

-- +goose StatementBegin
DROP TABLE IF EXISTS ai_integration;
-- +goose StatementEnd
