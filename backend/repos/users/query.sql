-- name: GetUserByID :one
SELECT *
FROM users
WHERE id = @id;

-- name: GetUserByEmail :one
SELECT *
FROM users
WHERE email = @email;

-- name: CreateUser :one
INSERT INTO users (
        id,
        email,
        identity_commitment,
        encrypted_internal_nullifier,
        encrypted_identity_secret,
        is_encrypted,
        created_at
    )
VALUES ($1, $2, $3, $4, $5, $6, NOW())
RETURNING *;

-- name: UpdateUser :one
UPDATE users
SET identity_commitment = @identity_commitment,
    encrypted_internal_nullifier = @encrypted_internal_nullifier,
    encrypted_identity_secret = @encrypted_identity_secret
WHERE id = @id
RETURNING *;