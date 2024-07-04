CREATE TABLE events (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description VARCHAR NOT NULL,
    url VARCHAR NOT NULL,
    admin_code VARCHAR NOT NULL,
    chain_id VARCHAR NOT NULL,
    context_id VARCHAR NOT NULL,
    issuer_key_id VARCHAR NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);