-- Price comparison tables. Works on PostgreSQL and SQLite.
-- App also creates these automatically via Base.metadata.create_all on startup;
-- run this manually only if you manage the schema yourself.

CREATE TABLE IF NOT EXISTS labs (
    id              VARCHAR(36)  PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    normalized_name VARCHAR(150) NOT NULL,
    pin_code        VARCHAR(6)   NOT NULL,
    CONSTRAINT uq_labs_name_pin UNIQUE (normalized_name, pin_code)
);
CREATE INDEX IF NOT EXISTS ix_labs_pin_code ON labs (pin_code);

CREATE TABLE IF NOT EXISTS tests (
    id              VARCHAR(36)  PRIMARY KEY,
    name            VARCHAR(500) NOT NULL,
    normalized_name VARCHAR(500) NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS ix_tests_normalized_name ON tests (normalized_name);

CREATE TABLE IF NOT EXISTS lab_test_prices (
    lab_id     VARCHAR(36) NOT NULL REFERENCES labs (id)  ON DELETE CASCADE,
    test_id    VARCHAR(36) NOT NULL REFERENCES tests (id) ON DELETE CASCADE,
    price      DOUBLE PRECISION NOT NULL CHECK (price > 0),
    updated_at TIMESTAMP NOT NULL,
    PRIMARY KEY (lab_id, test_id)
);
CREATE INDEX IF NOT EXISTS ix_ltp_test_id ON lab_test_prices (test_id);
