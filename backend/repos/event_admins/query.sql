-- name: CreateEventAdmin :one
INSERT INTO event_admins (
        event_id,
        user_id
    ) VALUES (
        $1,
        $2
    ) RETURNING *; 

-- name: GetEventAdminsByEventId :many
SELECT * FROM event_admins WHERE event_id = $1;