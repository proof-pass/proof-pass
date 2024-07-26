-- name: GetEventByID :one
SELECT *
FROM events
WHERE id = $1;

-- name: ListEvents :many
SELECT *
FROM events;

-- name: CreateEvent :one
INSERT INTO events (
        id,
        name,
        description,
        url,
        admin_code,
        chain_id,
        context_id,
        context_string,
        issuer_key_id,
        start_date,
        end_date
    ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11
    ) RETURNING *;

-- name: UpdateEvent :one
UPDATE events SET
    name = COALESCE($2, name),
    description = COALESCE($3, description),
    url = COALESCE($4, url),
    admin_code = COALESCE($5, admin_code),
    start_date = COALESCE($6, start_date),
    end_date = COALESCE($7, end_date)
WHERE id = $1
RETURNING *;