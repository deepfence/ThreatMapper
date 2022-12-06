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

-- name: GetUser :one
SELECT users.id,
       users.first_name,
       users.last_name,
       users.email,
       users.role_id,
       role.name    as role_name,
       users.group_ids,
       users.company_id,
       company.name as company_name,
       users.password_hash,
       users.is_active,
       users.password_invalidated,
       users.created_at,
       users.updated_at
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
       role.name    as role_name,
       users.group_ids,
       users.company_id,
       company.name as company_name,
       users.password_hash,
       users.is_active,
       users.password_invalidated,
       users.created_at,
       users.updated_at
FROM users
         INNER JOIN role ON role.id = users.role_id
         INNER JOIN company ON company.id = users.company_id
WHERE users.email = $1
LIMIT 1;

-- name: UpdatePasswordHash :exec
UPDATE users
SET password_hash = $1
WHERE id = $2;

-- name: GetPasswordHash :one
SELECT password_hash
FROM users
WHERE id = $1
LIMIT 1;

-- name: GetUsers :many
SELECT *
FROM users
WHERE company_id = $1
ORDER BY first_name;

-- name: GetActiveUsers :many
SELECT *
FROM users
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