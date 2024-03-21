-- +goose Up

-- +goose StatementBegin

ALTER TABLE license ADD license_email character varying(100) NOT NULL default '';
ALTER TABLE license ADD license_email_domain character varying(100) NOT NULL default '';
ALTER TABLE license ADD no_of_cloud_accounts bigint NOT NULL default 100000;
ALTER TABLE license ADD no_of_registries bigint NOT NULL default 100000;
ALTER TABLE license ADD no_of_images_in_registry bigint NOT NULL default 1000000;

-- +goose StatementEnd

-- +goose Down

-- +goose StatementBegin

ALTER TABLE license DROP COLUMN license_email;
ALTER TABLE license DROP COLUMN license_email_domain;
ALTER TABLE license DROP COLUMN no_of_cloud_accounts;
ALTER TABLE license DROP COLUMN no_of_registries;
ALTER TABLE license DROP COLUMN no_of_images_in_registry;

-- +goose StatementEnd
