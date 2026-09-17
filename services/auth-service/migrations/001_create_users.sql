-- Up Migration

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email VARCHAR(320) NOT NULL UNIQUE,

    password_hash TEXT,

    role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    email_verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Down Migration

DROP TABLE users;