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
    updated_at   timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER company_updated_at
    BEFORE UPDATE
    ON company
    FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- name: CreateCompany :one
INSERT INTO company (name, email_domain)
VALUES ($1, $2)
RETURNING *;

-- name: GetCompany :one
SELECT *
FROM company
WHERE id = $1
LIMIT 1;

-- name: GetCompanyByDomain :one
SELECT *
FROM company
WHERE email_domain = $1
LIMIT 1;

-- name: GetCompanies :many
SELECT *
FROM company
ORDER BY name;

-- name: DeleteCompany :exec
DELETE
FROM company
WHERE id = $1;

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

-- name: CreateUserGroup :one
INSERT INTO user_group (name, company_id, is_system)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetUserGroupByID :one
SELECT *
FROM user_group
WHERE id = $1
LIMIT 1;

-- name: GetUserGroups :many
SELECT *
FROM user_group
WHERE company_id = $1
ORDER BY name;

CREATE TABLE role
(
    id         SERIAL PRIMARY KEY,
    name       character varying(32)                              NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER role_updated_at
    BEFORE UPDATE
    ON role
    FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- name: CreateRole :one
INSERT INTO role (name)
VALUES ($1)
RETURNING *;

-- name: GetRoleByID :one
SELECT *
FROM role
WHERE id = $1
LIMIT 1;

-- name: GetRoleByName :one
SELECT *
FROM role
WHERE name = $1
LIMIT 1;

-- name: GetRoles :many
SELECT *
FROM role
ORDER BY name;

CREATE TABLE users
(
    id                   BIGSERIAL PRIMARY KEY,
    first_name           character varying(64)                              NOT NULL,
    last_name            character varying(64)                              NOT NULL,
    email                character varying(64)                              NOT NULL,
    role_id              integer                                            NOT NULL,
    group_ids            jsonb                    DEFAULT '[
      "default"
    ]'::jsonb                                                               NOT NULL,
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

-- name: CreateUser :one
INSERT INTO users (first_name, last_name, email, role_id, group_ids, company_id, password_hash, is_active,
                   password_invalidated)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetUser :one
SELECT *
FROM users
WHERE id = $1
LIMIT 1;

-- name: GetUsers :many
SELECT *
FROM users
WHERE company_id = $1
ORDER BY first_name;

-- name: DeleteUser :exec
DELETE
FROM users
WHERE id = $1;

CREATE TABLE api_token
(
    id                 BIGSERIAL PRIMARY KEY,
    api_token          UUID                                               NOT NULL,
    name               character varying(64)                              NOT NULL,
    company_id         integer                                            NOT NULL,
    group_id           integer                                            NOT NULL,
    role_id            integer                                            NOT NULL,
    created_by_user_id integer                                            NOT NULL,
    created_at         timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at         timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_company
        FOREIGN KEY (company_id)
            REFERENCES company (id),
    CONSTRAINT fk_created_by_user_id
        FOREIGN KEY (created_by_user_id)
            REFERENCES users (id),
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

-- name: CreateApiToken :one
INSERT INTO api_token (api_token, name, company_id, role_id, group_id, created_by_user_id)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetApiToken :one
SELECT *
FROM api_token
WHERE id = $1
LIMIT 1;

-- name: GetApiTokens :many
SELECT *
FROM api_token
WHERE company_id = $1
ORDER BY name;

-- name: DeleteApiToken :exec
DELETE
FROM api_token
WHERE id = $1;