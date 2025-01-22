-- +goose Up

-- +goose StatementBegin
CREATE TABLE public.deepfence_communication
(
    id             bigint PRIMARY KEY,
    title          text                                               NOT NULL,
    content        text                                               NOT NULL,
    link           text                                               NOT NULL,
    link_title     text                                               NOT NULL,
    button_content text                                               NOT NULL,
    read           bool                     DEFAULT FALSE             NOT NULL,
    created_at     timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at     timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER deepfence_communication_updated_at
    BEFORE UPDATE
    ON deepfence_communication
    FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();
-- +goose StatementEnd

-- +goose Down

-- +goose StatementBegin
DROP TABLE IF EXISTS deepfence_communication;
-- +goose StatementEnd
