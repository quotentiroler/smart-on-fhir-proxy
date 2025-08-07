-- Initialize database for Inferno testing
CREATE DATABASE IF NOT EXISTS inferno;

-- Switch to inferno database
\c inferno;

-- Create basic tables that Inferno might need
CREATE TABLE IF NOT EXISTS test_sessions (
    id SERIAL PRIMARY KEY,
    test_suite_id VARCHAR(255) NOT NULL,
    test_run_identifier VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'running',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_results (
    id SERIAL PRIMARY KEY,
    test_session_id INTEGER REFERENCES test_sessions(id),
    test_id VARCHAR(255) NOT NULL,
    result VARCHAR(50) NOT NULL,
    message TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fhir_resources (
    id SERIAL PRIMARY KEY,
    test_session_id INTEGER REFERENCES test_sessions(id),
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    resource_content JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_sessions_suite_id ON test_sessions(test_suite_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_run_id ON test_sessions(test_run_identifier);
CREATE INDEX IF NOT EXISTS idx_test_results_session_id ON test_results(test_session_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_id ON test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_fhir_resources_session_id ON fhir_resources(test_session_id);
CREATE INDEX IF NOT EXISTS idx_fhir_resources_type ON fhir_resources(resource_type);

-- Grant permissions to postgres user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
