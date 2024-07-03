-- name: GetAttendancesByEventIdAndNullifier :many
SELECT *
FROM attendances
WHERE event_id = @event_id
    AND nullifier = @nullifier;

-- name: CreateOne :one
INSERT INTO attendances (event_id, nullifier, created_at)
VALUES (@event_id, @nullifier, NOW())
RETURNING *;