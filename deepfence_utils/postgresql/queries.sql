-- name: CreateCompany :one
INSERT INTO company (name, email_domain, namespace)
VALUES ($1, $2, $3)
RETURNING *;

-- name: CountCompanies :one
SELECT count(*)
FROM company;

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

-- name: CreateUser :one
INSERT INTO users (first_name, last_name, email, role_id, group_ids, company_id, password_hash, is_active,
                   password_invalidated)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: CountUsers :one
SELECT count(*)
FROM users;

-- name: CountActiveUsers :one
SELECT count(*)
FROM users
WHERE users.is_active = true;

-- name: CountActiveAdminUsers :one
SELECT count(*)
FROM users
         INNER JOIN role ON role.id = users.role_id
WHERE users.is_active = true
  AND role.name = 'admin';

-- name: GetUser :one
SELECT users.id,
       users.first_name,
       users.last_name,
       users.email,
       users.role_id,
       role.name         as role_name,
       users.group_ids,
       users.company_id,
       company.name      as company_name,
       users.password_hash,
       users.is_active,
       users.password_invalidated,
       users.created_at,
       users.updated_at,
       company.namespace as company_namespace
FROM users
         INNER JOIN role ON role.id = users.role_id
         INNER JOIN company ON company.id = users.company_id
WHERE users.id = $1
LIMIT 1;

-- name: GetUserByEmail :one
SELECT users.id,
       users.first_name,
       users.last_name,
       users.email,
       users.role_id,
       role.name         as role_name,
       users.group_ids,
       users.company_id,
       company.name      as company_name,
       users.password_hash,
       users.is_active,
       users.password_invalidated,
       users.created_at,
       users.updated_at,
       company.namespace as company_namespace
FROM users
         INNER JOIN role ON role.id = users.role_id
         INNER JOIN company ON company.id = users.company_id
WHERE users.email = $1
LIMIT 1;

-- name: UpdateUser :one
UPDATE users
SET first_name           = $1,
    last_name            = $2,
    role_id              = $3,
    group_ids            = $4,
    is_active            = $5,
    password_invalidated = $6
WHERE id = $7
RETURNING *;

-- name: UpdatePassword :exec
UPDATE users
SET password_hash = $1
WHERE id = $2;

-- name: GetPasswordHash :one
SELECT password_hash
FROM users
WHERE id = $1
LIMIT 1;

-- name: GetUsers :many
SELECT users.id,
       users.first_name,
       users.last_name,
       users.email,
       users.role_id,
       role.name         as role_name,
       users.group_ids,
       users.company_id,
       company.name      as company_name,
       users.is_active,
       users.password_invalidated,
       users.created_at,
       users.updated_at,
       company.namespace as company_namespace
FROM users
         INNER JOIN role ON role.id = users.role_id
         INNER JOIN company ON company.id = users.company_id
ORDER BY first_name;

-- name: GetActiveUsers :many
SELECT users.id,
       users.first_name,
       users.last_name,
       users.email,
       users.role_id,
       role.name         as role_name,
       users.group_ids,
       users.company_id,
       company.name      as company_name,
       users.is_active,
       users.password_invalidated,
       users.created_at,
       users.updated_at,
       company.namespace as company_namespace
FROM users
         INNER JOIN role ON role.id = users.role_id
         INNER JOIN company ON company.id = users.company_id
WHERE is_active = 't'
ORDER BY first_name;

-- name: GetUsersByCompanyID :many
SELECT users.id,
       users.first_name,
       users.last_name,
       users.email,
       users.role_id,
       role.name         as role_name,
       users.group_ids,
       users.company_id,
       company.name      as company_name,
       users.is_active,
       users.password_invalidated,
       users.created_at,
       users.updated_at,
       company.namespace as company_namespace
FROM users
         INNER JOIN role ON role.id = users.role_id
         INNER JOIN company ON company.id = users.company_id
WHERE company_id = $1
ORDER BY first_name;

-- name: GetActiveUsersByCompanyID :many
SELECT users.id,
       users.first_name,
       users.last_name,
       users.email,
       users.role_id,
       role.name         as role_name,
       users.group_ids,
       users.company_id,
       company.name      as company_name,
       users.is_active,
       users.password_invalidated,
       users.created_at,
       users.updated_at,
       company.namespace as company_namespace
FROM users
         INNER JOIN role ON role.id = users.role_id
         INNER JOIN company ON company.id = users.company_id
WHERE company_id = $1
  AND is_active = 't'
ORDER BY first_name;

-- name: DeleteUser :exec
DELETE
FROM users
WHERE id = $1;

-- name: CreateApiToken :one
INSERT INTO api_token (api_token, name, company_id, role_id, group_id, created_by_user_id)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetApiToken :one
SELECT *
FROM api_token
WHERE id = $1
LIMIT 1;

-- name: GetApiTokenByToken :one
SELECT api_token.api_token,
       api_token.name,
       api_token.company_id,
       api_token.role_id,
       api_token.group_id,
       api_token.created_by_user_id,
       users.first_name           as first_name,
       users.last_name            as last_name,
       users.email                as email,
       role.name                  as role_name,
       company.name               as company_name,
       company.namespace          as company_namespace,
       users.is_active            as is_user_active,
       users.password_invalidated as user_password_invalidated,
       api_token.created_at,
       api_token.updated_at
FROM api_token
         INNER JOIN users ON users.id = api_token.created_by_user_id
         INNER JOIN role ON role.id = api_token.role_id
         INNER JOIN company ON company.id = api_token.company_id
WHERE api_token = $1
LIMIT 1;

-- name: GetApiTokensByUser :many
SELECT *
FROM api_token
WHERE created_by_user_id = $1;

-- name: GetApiTokens :many
SELECT *
FROM api_token
WHERE company_id = $1
ORDER BY name;

-- name: DeleteApiToken :exec
DELETE
FROM api_token
WHERE id = $1;

-- name: DeleteApiTokensByUserID :exec
DELETE
FROM api_token
WHERE created_by_user_id = $1;

-- name: GetApiTokenByActiveUser :one
SELECT api_token.api_token
FROM api_token
         INNER JOIN users u on api_token.created_by_user_id = u.id
WHERE u.is_active = 'true'
LIMIT 1;

-- name: CreateSetting :one
INSERT INTO setting (key, value, is_visible_on_ui)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetSetting :one
SELECT *
FROM setting
WHERE key = $1
LIMIT 1;

-- name: GetSettings :many
SELECT *
FROM setting
ORDER BY key;

-- name: GetVisibleSettings :many
SELECT *
FROM setting
WHERE is_visible_on_ui = true
ORDER BY key;

-- name: UpdateSetting :exec
UPDATE setting
SET value            = $1,
    is_visible_on_ui = $2
WHERE key = $3;

-- name: UpdateSettingById :exec
UPDATE setting
SET value            = $1,
    is_visible_on_ui = $2
WHERE id = $3;

-- name: DeleteSettingByID :exec
DELETE
FROM setting
WHERE id = $1;

-- name: CreatePasswordReset :one
INSERT INTO password_reset (code, expiry, user_id)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetPasswordResetByCode :one
SELECT password_reset.id,
       password_reset.code,
       password_reset.expiry,
       password_reset.user_id,
       password_reset.created_at,
       password_reset.updated_at
FROM password_reset
         INNER JOIN users u on password_reset.user_id = u.id
WHERE password_reset.code = $1
LIMIT 1;

-- name: GetPasswordResetById :one
SELECT password_reset.id,
       password_reset.code,
       password_reset.expiry,
       password_reset.user_id,
       password_reset.created_at,
       password_reset.updated_at
FROM password_reset
         INNER JOIN users u on password_reset.user_id = u.id
WHERE password_reset.id = $1
LIMIT 1;

-- name: DeletePasswordResetByUserEmail :exec
DELETE
FROM password_reset pr
    USING users u
WHERE pr.user_id = u.id
  AND u.email = $1;

-- name: DeletePasswordResetByExpiry :exec
DELETE
FROM password_reset
WHERE expiry < now();

-- name: CreateUserInvite :one
INSERT INTO user_invite (email, code, created_by_user_id, role_id, company_id, accepted, expiry)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: UpdateUserInvite :one
UPDATE user_invite
SET code=$1,
    created_by_user_id=$2,
    role_id=$3,
    company_id=$4,
    accepted=$5,
    expiry=$6
WHERE id = $7
RETURNING *;

-- name: GetUserInviteByEmail :one
SELECT *
FROM user_invite
WHERE email = $1
LIMIT 1;

-- name: GetUserInviteByCode :one
SELECT *
FROM user_invite
WHERE code = $1
LIMIT 1;

-- name: DeleteUserInviteByExpiry :exec
DELETE
FROM user_invite
WHERE expiry < now();

-- name: DeleteUserInviteByUserID :exec
DELETE
FROM user_invite
WHERE created_by_user_id = $1;

-- name: CreateContainerRegistry :one
INSERT INTO container_registry (name, registry_type, encrypted_secret, non_secret, extras)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: CountContainerRegistry :one
SELECT count(*)
FROM container_registry;

-- name: GetContainerRegistry :one
SELECT container_registry.id,
       container_registry.name,
       container_registry.registry_type,
       container_registry.encrypted_secret,
       container_registry.non_secret,
       container_registry.created_at,
       container_registry.updated_at,
       container_registry.extras
FROM container_registry
WHERE container_registry.id = $1
LIMIT 1;

-- name: GetContainerRegistrySafe :one
SELECT container_registry.id,
       container_registry.name,
       container_registry.registry_type,
       container_registry.non_secret,
       container_registry.created_at,
       container_registry.updated_at
FROM container_registry
WHERE container_registry.id = $1
LIMIT 1;

-- name: GetContainerRegistries :many
SELECT container_registry.id,
       container_registry.name,
       container_registry.registry_type,
       container_registry.encrypted_secret,
       container_registry.non_secret,
       container_registry.created_at,
       container_registry.updated_at,
       container_registry.extras
FROM container_registry;

-- name: GetContainerRegistriesSafe :many
SELECT container_registry.id,
       container_registry.name,
       container_registry.registry_type,
       container_registry.non_secret,
       container_registry.created_at,
       container_registry.updated_at
FROM container_registry;

-- name: GetContainerRegistryByType :many
SELECT container_registry.id,
       container_registry.name,
       container_registry.registry_type,
       container_registry.encrypted_secret,
       container_registry.non_secret,
       container_registry.created_at,
       container_registry.updated_at,
       container_registry.extras
FROM container_registry
WHERE container_registry.registry_type = $1;

-- name: GetContainerRegistryByTypeAndName :one
SELECT container_registry.id,
       container_registry.name,
       container_registry.registry_type,
       container_registry.encrypted_secret,
       container_registry.non_secret,
       container_registry.created_at,
       container_registry.updated_at,
       container_registry.extras
FROM container_registry
WHERE container_registry.registry_type = $1
  AND container_registry.name = $2
LIMIT 1;

-- name: UpdateContainerRegistry :one
UPDATE container_registry
SET name=$1,
    registry_type=$2,
    encrypted_secret=$3,
    non_secret=$4,
    extras=$5
WHERE id = $6
RETURNING *;

-- name: DeleteContainerRegistry :exec
DELETE
FROM container_registry
WHERE id = $1;

-- name: CreateAuditLog :exec
INSERT INTO audit_log (event, action, resources, success, user_email, user_role, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7);

-- name: GetAuditLogs :many
SELECT l.event,
       l.action,
       l.resources,
       l.success,
       l.user_email as email,
       l.user_role  as role,
       l.created_at
FROM audit_log l
ORDER BY id DESC
OFFSET $1 LIMIT $2;

-- name: CountAuditLogs :one
SELECT count(*)
FROM audit_log;

-- name: GetAuditLogsLast5Minutes :many
SELECT l.event,
       l.action,
       l.resources,
       l.success,
       l.user_email as email,
       l.user_role  as role,
       l.created_at
FROM audit_log l
WHERE l.created_at < (now() - interval '5 minutes')
ORDER BY l.created_at DESC;

-- name: DeleteAuditLogsOlderThan30days :one
WITH deleted AS (
    DELETE
        FROM audit_log
            WHERE created_at < (now() - interval '30 days')
            RETURNING *)
SELECT count(*)
FROM deleted;

-- name: CreateGenerativeAiIntegration :one
INSERT INTO generative_ai_integration (integration_type, label, config, created_by_user_id)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: UpdateGenerativeAiIntegrationDefault :exec
UPDATE generative_ai_integration
SET default_integration = (CASE WHEN id = $1 THEN true ELSE false END);

-- name: UpdateGenerativeAiIntegrationFirstRowDefault :exec
UPDATE generative_ai_integration
SET default_integration= true
WHERE ID = (SELECT ID FROM generative_ai_integration ORDER BY ID LIMIT 1);

-- name: GetGenerativeAiIntegrationFromID :one
SELECT *
FROM generative_ai_integration
WHERE id = $1
LIMIT 1;

-- name: GetDefaultGenerativeAiIntegration :one
SELECT *
FROM generative_ai_integration
WHERE default_integration = true
LIMIT 1;

-- name: GetGenerativeAiIntegrationByType :many
SELECT *
FROM generative_ai_integration
WHERE integration_type = $1;

-- name: CountGenerativeAiIntegrationByLabel :one
SELECT COUNT(*)
FROM generative_ai_integration
WHERE label = $1
LIMIT 1;

-- name: GetGenerativeAiIntegrations :many
SELECT *
FROM generative_ai_integration;

-- name: UpdateGenerativeAiIntegrationStatus :exec
UPDATE generative_ai_integration
SET error_msg      = $2,
    last_sent_time = now()
WHERE id = $1;

-- name: DeleteGenerativeAiIntegration :one
DELETE
FROM generative_ai_integration
WHERE id = $1
RETURNING *;

-- name: CreateIntegration :one
INSERT INTO integration (resource, filters, integration_type, interval_minutes, config, created_by_user_id)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetIntegrationFromID :one
SELECT *
FROM integration
WHERE id = $1
LIMIT 1;

-- name: GetIntegrationsFromIDs :many
SELECT *
FROM integration
WHERE id = ANY($1::int[]);

-- name: GetIntegrationsFromType :many
SELECT *
FROM integration
WHERE integration_type = $1;

-- name: GetIntegrations :many
SELECT *
FROM integration;

-- name: UpdateIntegrationStatus :exec
UPDATE integration
SET error_msg      = $2,
    last_sent_time = now()
WHERE id = $1;

-- name: UpdateIntegration :exec
UPDATE integration
SET resource        = $1,
    filters         = $2,
    integration_type= $3,
    interval_minutes= $4,
    config          = $5
WHERE id = $6;


-- name: DeleteIntegrationByUserID :exec
DELETE
FROM integration
WHERE created_by_user_id = $1;

-- name: DeleteIntegrations :exec
DELETE
FROM integration
WHERE id = ANY ($1::int[]);

-- name: CreateSchedule :one
INSERT INTO scheduler (action, description, cron_expr, payload, is_enabled, is_system, status)
VALUES ($1, $2, $3, $4, $5, $6, '')
RETURNING *;

-- name: GetSchedule :one
SELECT *
FROM scheduler
WHERE id = $1
LIMIT 1;

-- name: GetSchedules :many
SELECT *
FROM scheduler
ORDER BY created_at;

-- name: GetActiveSchedules :many
SELECT *
FROM scheduler
WHERE is_enabled = 't'
ORDER BY created_at;

-- name: UpdateScheduleStatus :exec
UPDATE scheduler
SET status      = $1,
    last_ran_at = now()
WHERE id = $2;

-- name: UpdateSchedule :exec
UPDATE scheduler
SET description = $1,
    cron_expr   = $2,
    payload     = $3,
    is_enabled  = $4,
    status      = $5
WHERE id = $6;

-- name: DeleteSchedule :exec
DELETE
FROM scheduler
WHERE id = $1;

-- name: DeleteCustomSchedule :exec
DELETE
FROM scheduler
WHERE id = $1
  AND is_system = 'f';

-- name: UpsertLicense :one
INSERT INTO license (license_key, start_date, end_date, no_of_hosts, current_hosts, is_active, license_type,
                     deepfence_support_email, notification_threshold_percentage, registry_credentials, message,
                     description, no_of_cloud_accounts, no_of_registries, no_of_images_in_registry, license_email,
                     license_email_domain)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
ON CONFLICT (license_key) DO UPDATE
    SET start_date                        = $2,
        end_date                          = $3,
        no_of_hosts                       = $4,
        current_hosts                     = $5,
        is_active                         = $6,
        license_type                      = $7,
        deepfence_support_email           = $8,
        notification_threshold_percentage = $9,
        registry_credentials              = $10,
        message                           = $11,
        description                       = $12,
        no_of_cloud_accounts              = $13,
        no_of_registries                  = $14,
        no_of_images_in_registry          = $15,
        license_email                     = $16,
        license_email_domain              = $17
RETURNING *;

-- name: GetLicenseByKey :one
SELECT *
FROM license
WHERE license_key = $1
LIMIT 1;

-- name: GetLicense :one
SELECT *
FROM license
LIMIT 1;

-- name: GetActiveLicense :one
SELECT *
FROM license
WHERE is_active = true
ORDER BY end_date DESC
LIMIT 1;

-- name: CountLicenses :one
SELECT count(*)
FROM license;

-- name: UpdateNotificationThreshold :exec
UPDATE license
SET notification_threshold_percentage = $1,
    notification_threshold_updated_at = now()
WHERE license_key = $2;

-- name: DeleteLicense :exec
DELETE
FROM license
WHERE license_key = $1;