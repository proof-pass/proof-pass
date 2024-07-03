CREATE TABLE attendances (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR NOT NULL,
    nullifier VARCHAR NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_id_nullifier ON attendances(event_id, nullifier);