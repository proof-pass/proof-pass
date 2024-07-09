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