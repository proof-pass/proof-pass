CREATE TABLE event_admins (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(event_id, user_id)
);

CREATE UNIQUE INDEX idx_event_id_user_id ON event_admins(event_id, user_id);
