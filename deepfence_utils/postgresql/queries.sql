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