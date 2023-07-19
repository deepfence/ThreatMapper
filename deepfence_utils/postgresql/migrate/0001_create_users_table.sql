-- +goose Up

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_modified_column()
    RETURNS TRIGGER AS
$$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE company
(
    id           SERIAL PRIMARY KEY,
    name         character varying(64)                              NOT NULL,
    email_domain character varying(64)                              NOT NULL,
    created_at   timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at   timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    namespace    character varying(64)                              NOT NULL
);

CREATE TRIGGER company_updated_at
    BEFORE UPDATE
    ON company
    FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();


CREATE TABLE user_group
(
    id         SERIAL PRIMARY KEY,
    name       character varying(32)                              NOT NULL,
    is_system  boolean                  DEFAULT false             NOT NULL,
    company_id integer                                            NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER user_group_updated_at
    BEFORE UPDATE
    ON user_group
    FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();


CREATE TABLE role
(
    id         SERIAL PRIMARY KEY,
    name       character varying(32)                              NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER role_updated_at
    BEFORE UPDATE
    ON role
    FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();


CREATE TABLE users
(
    id                   BIGSERIAL PRIMARY KEY,
    first_name           character varying(64)                              NOT NULL,
    last_name            character varying(64)                              NOT NULL,
    email                character varying(64)                              NOT NULL,
    role_id              integer                                            NOT NULL,
    group_ids            jsonb                                              NOT NULL,
    company_id           integer                                            NOT NULL,
    password_hash        character varying(255)                             NOT NULL,
    is_active            boolean                  DEFAULT true              NOT NULL,
    password_invalidated boolean                  DEFAULT false             NOT NULL,
    created_at           timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at           timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_company
        FOREIGN KEY (company_id)
            REFERENCES company (id),
    CONSTRAINT fk_role
        FOREIGN KEY (role_id)
            REFERENCES role (id)
);

CREATE TRIGGER user_updated_at
    BEFORE UPDATE
    ON users
    FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();


CREATE TABLE api_token
(
    id                 BIGSERIAL PRIMARY KEY,
    api_token          UUID                                               NOT NULL,
    name               character varying(64)                              NOT NULL,
    company_id         integer                                            NOT NULL,
    group_id           integer                                            NOT NULL,
    role_id            integer                                            NOT NULL,
    created_by_user_id bigint                                             NOT NULL,
    created_at         timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at         timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (api_token),
    CONSTRAINT fk_company
        FOREIGN KEY (company_id)
            REFERENCES company (id),
    CONSTRAINT fk_created_by_user_id
        FOREIGN KEY (created_by_user_id)
            REFERENCES users (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_role
        FOREIGN KEY (role_id)
            REFERENCES role (id),
    CONSTRAINT fk_group
        FOREIGN KEY (group_id)
            REFERENCES user_group (id)
);

CREATE TRIGGER api_token_updated_at
    BEFORE UPDATE
    ON api_token
    FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();


CREATE TABLE setting
(
    id               BIGSERIAL PRIMARY KEY,
    key              text                                               NOT NULL,
    value            jsonb                                              NOT NULL,
    is_visible_on_ui bool                     DEFAULT false             NOT NULL,
    created_at       timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at       timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (key)
);

CREATE TRIGGER setting_updated_at
    BEFORE UPDATE
    ON setting
    FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();
-- +goose StatementEnd

-- +goose Down

-- +goose StatementBegin
DROP TABLE IF EXISTS api_token, role, user_group, users, company, setting;
-- +goose StatementEnd
