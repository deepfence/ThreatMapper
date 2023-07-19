-- +goose Up

-- +goose StatementBegin
CREATE TABLE container_registry
(
    id               SERIAL PRIMARY KEY,
    name             character varying(64)                              NOT NULL,
    registry_type    character varying(64)                              NOT NULL,
    encrypted_secret jsonb                                              NOT NULL,
    non_secret       jsonb                                              NOT NULL,
    extras           jsonb                                              NOT NULL,
    created_at       timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at       timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT container_registry_unique UNIQUE (registry_type, encrypted_secret, non_secret)

);

CREATE TRIGGER container_registry_updated_at
    BEFORE UPDATE
    ON container_registry
    FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();


CREATE TABLE public.integration
(
    id                 SERIAL PRIMARY KEY,
    resource           character varying(32)                              NOT NULL,
    -- resource: vulnerability / compliance / secret, etc
    filters            jsonb                                              NOT NULL,
    integration_type   character varying(64)                              NOT NULL,
    --  integration_type: email / slack / splunk, etc
    interval_minutes   integer                                            NOT NULL,
    last_sent_time     timestamp with time zone                           NULL,
    config             jsonb                                              NOT NULL,
    error_msg          text                                               NULL,
    created_by_user_id bigint                                             NOT NULL,
    created_at         timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at         timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_created_by_user_id
        FOREIGN KEY (created_by_user_id)
            REFERENCES users (id)
            ON DELETE CASCADE
);

CREATE TRIGGER integration_updated_at
    BEFORE UPDATE
    ON integration
    FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

CREATE TABLE public.password_reset
(
    id         SERIAL PRIMARY KEY,
    user_id    bigint                                             NOT NULL,
    code       UUID                                               NOT NULL,
    expiry     timestamp with time zone                           NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (code),
    CONSTRAINT fk_user_id
        FOREIGN KEY (user_id)
            REFERENCES users (id)
            ON DELETE CASCADE
);

CREATE TRIGGER password_reset_updated_at
    BEFORE UPDATE
    ON password_reset
    FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

CREATE TABLE public.user_invite
(
    id                 SERIAL PRIMARY KEY,
    email              character varying(64)                              NOT NULL,
    code               UUID                                               NOT NULL,
    created_by_user_id bigint                                             NOT NULL,
    role_id            integer                                            NOT NULL,
    company_id         integer                                            NOT NULL,
    accepted           boolean                  default false             NOT NULL,
    expiry             timestamp with time zone                           NOT NULL,
    created_at         timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at         timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (email),
    UNIQUE (code),
    CONSTRAINT fk_created_by_user_id
        FOREIGN KEY (created_by_user_id)
            REFERENCES users (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_role
        FOREIGN KEY (role_id)
            REFERENCES role (id)
);

CREATE TRIGGER user_invite_updated_at
    BEFORE UPDATE
    ON user_invite
    FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

CREATE TABLE public.audit_log
(
    id         BIGSERIAL PRIMARY KEY,
    event      character varying(100)                             NOT NULL,
    action     character varying(100)                             NOT NULL,
    resources  text                                               NOT NULL,
    success    boolean                                            NOT NULL,
    user_email character varying(64)                              NOT NULL,
    user_role  character varying(32)                              NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
-- +goose StatementEnd

-- +goose Down

-- +goose StatementBegin
DROP TABLE IF EXISTS container_registry, integration, password_reset, audit_log, user_invite;
-- +goose StatementEnd
