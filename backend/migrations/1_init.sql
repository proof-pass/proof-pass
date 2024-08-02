CREATE TABLE attendances (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR NOT NULL,
    nullifier VARCHAR NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_id_nullifier ON attendances(event_id, nullifier);

CREATE TABLE email_credentials (
    id VARCHAR PRIMARY KEY,
    identity_commitment VARCHAR NOT NULL,
    data VARCHAR NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL,
    expire_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX idx_identity_commitment ON email_credentials(identity_commitment);

CREATE TABLE events (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description VARCHAR NOT NULL,
    url VARCHAR NOT NULL,
    admin_code VARCHAR NOT NULL,
    chain_id VARCHAR NOT NULL,
    context_id VARCHAR NOT NULL,
    context_string VARCHAR NOT NULL,
    issuer_key_id VARCHAR NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE registrations (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    email VARCHAR NOT NULL,
    UNIQUE(event_id, email)
);

CREATE TABLE ticket_credentials (
    id VARCHAR PRIMARY KEY,
    email VARCHAR NOT NULL,
    event_id VARCHAR NOT NULL,
    data VARCHAR NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL,
    expire_at TIMESTAMPTZ NOT NULL
);

-- Create index on (event_id, email)
CREATE UNIQUE INDEX idx_event_id_email ON ticket_credentials(event_id, email);

-- Create index on email
CREATE INDEX idx_email ON ticket_credentials(email);

CREATE TABLE users (
    id VARCHAR PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    identity_commitment VARCHAR NOT NULL,
    encrypted_internal_nullifier VARCHAR NOT NULL,
    encrypted_identity_secret VARCHAR NOT NULL,
    is_encrypted BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_email ON users(email);
