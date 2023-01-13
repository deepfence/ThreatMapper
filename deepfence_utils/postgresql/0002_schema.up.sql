START TRANSACTION;

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
);

CREATE TRIGGER integration_updated_at
    BEFORE UPDATE
    ON integration
    FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

COMMIT;
