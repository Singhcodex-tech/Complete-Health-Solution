-- Adds: tests.category, test_aliases, pincode_geo, price_upload_jobs.
-- The app does this automatically on start (create_all + app/db_migrate.py);
-- run by hand only if you manage the schema yourself. PostgreSQL / SQLite.

ALTER TABLE tests ADD COLUMN category VARCHAR(80);
CREATE INDEX IF NOT EXISTS ix_tests_category ON tests (category);

CREATE TABLE IF NOT EXISTS test_aliases (
    alias_normalized VARCHAR(500) PRIMARY KEY,
    alias            VARCHAR(500) NOT NULL,
    test_id          VARCHAR(36)  NOT NULL REFERENCES tests (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_test_aliases_test_id ON test_aliases (test_id);

CREATE TABLE IF NOT EXISTS pincode_geo (
    pin_code   VARCHAR(6) PRIMARY KEY,
    lat        DOUBLE PRECISION,
    lon        DOUBLE PRECISION,
    source     VARCHAR(20) NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_pincode_geo_lat ON pincode_geo (lat);
CREATE INDEX IF NOT EXISTS ix_pincode_geo_lon ON pincode_geo (lon);

CREATE TABLE IF NOT EXISTS price_upload_jobs (
    id             VARCHAR(36) PRIMARY KEY,
    kind           VARCHAR(10) NOT NULL,
    status         VARCHAR(10) NOT NULL,
    filename       VARCHAR(255) NOT NULL,
    created_by     VARCHAR(36) REFERENCES users (id) ON DELETE SET NULL,
    options        TEXT NOT NULL,
    report         TEXT,
    error          TEXT,
    file_path      VARCHAR(500),
    changes_path   VARCHAR(500),
    target_job_id  VARCHAR(36),
    created_at     TIMESTAMP NOT NULL,
    finished_at    TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_price_upload_jobs_status ON price_upload_jobs (status);
CREATE INDEX IF NOT EXISTS ix_price_upload_jobs_created_at ON price_upload_jobs (created_at);
