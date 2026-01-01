CREATE DATABASE IF NOT EXISTS jagawargadb;
USE jagawargadb;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nik VARCHAR(16) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS authorities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    privacy_level VARCHAR(10) NOT NULL CHECK (privacy_level IN ('public', 'private', 'anonymous')),
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_progress', 'resolved', 'escalated')),
    authority_department VARCHAR(50) REFERENCES authorities(department),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    escalated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reports_department_status 
    ON reports (authority_department, status);

CREATE INDEX IF NOT EXISTS idx_reports_stale 
    ON reports (created_at, status) 
    WHERE status = 'submitted';

CREATE INDEX IF NOT EXISTS idx_reports_privacy 
    ON reports (privacy_level) 
    WHERE privacy_level = 'public';

CREATE INDEX IF NOT EXISTS idx_users_nik 
    ON users (nik);