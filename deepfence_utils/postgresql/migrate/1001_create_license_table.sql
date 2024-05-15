-- +goose Up

-- +goose StatementBegin
CREATE TABLE license
(
    id                                SERIAL PRIMARY KEY,
    license_key                       UUID UNIQUE                                        NOT NULL,
    start_date                        timestamp with time zone                           NOT NULL,
    end_date                          timestamp with time zone                           NOT NULL,
    no_of_hosts                       bigint                                             NOT NULL,
    current_hosts                     bigint                                             NOT NULL,
    is_active                         boolean                                            NOT NULL,
    license_type                      character varying(255)                             NOT NULL,
    deepfence_support_email           character varying(100)                             NOT NULL,
    notification_threshold_percentage integer                  default 95                NOT NULL,
    notification_threshold_updated_at timestamp with time zone                           NULL,
    registry_credentials              jsonb                                              NOT NULL,
    message                           character varying(255)                             NOT NULL,
    description                       text                                               NOT NULL,
    created_at                        timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at                        timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER license_updated_at
    BEFORE UPDATE
    ON license
    FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();
-- +goose StatementEnd

-- +goose Down

-- +goose StatementBegin
DROP TABLE IF EXISTS license;
-- +goose StatementEnd
