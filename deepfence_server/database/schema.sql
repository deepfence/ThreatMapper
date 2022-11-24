CREATE TABLE company
(
    id         SERIAL PRIMARY KEY,
    name       character varying(255)   NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


CREATE TABLE role
(
    id         SERIAL PRIMARY KEY,
    name       character varying(32)    NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE users
(
    id                   BIGSERIAL PRIMARY KEY,
    first_name           character varying(100)   NOT NULL,
    last_name            character varying(100)   NOT NULL,
    email                character varying(100)   NOT NULL,
    role_id              integer                  NOT NULL,
    company_id           integer                  NOT NULL,
    api_key              character varying(100)   NOT NULL,
    password_hash        character varying(255)   NOT NULL,
    created_at           timestamp with time zone NOT NULL,
    updated_at           timestamp with time zone NOT NULL,
    is_active            boolean DEFAULT true     NOT NULL,
    password_invalidated boolean DEFAULT false    NOT NULL,
    UNIQUE (api_key),
    CONSTRAINT fk_company
        FOREIGN KEY (company_id)
            REFERENCES company (id),
    CONSTRAINT fk_role
        FOREIGN KEY (role_id)
            REFERENCES role (id)
);
