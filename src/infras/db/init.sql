CREATE DATABASE IF NOT EXISTS jagawarga;
USE jagawarga;

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
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_progress', 'resolved', 'escalated')),
    authority_department VARCHAR(50) REFERENCES authorities(department),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    escalated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- Indexes for performance
    INDEX idx_reports_department_status (authority_department, status),
    INDEX idx_reports_stale (created_at, status) WHERE status = 'submitted',
    INDEX idx_reports_privacy (privacy_level) WHERE privacy_level = 'public'
);

-- Seed authorities
INSERT INTO authorities (department, name, email) VALUES
    ('kebersihan', 'Dinas Kebersihan Kota Bandung', 'kebersihan@bandung.go.id'),
    ('kesehatan', 'Dinas Kesehatan Kota Bandung', 'kesehatan@bandung.go.id'),
    ('infrastruktur', 'Dinas Pekerjaan Umum Bandung', 'pu@bandung.go.id'),
    ('keamanan', 'Kepolisian Resor Kota Bandung', 'polresta@bandung.go.id'),
    ('lingkungan', 'Badan Lingkungan Hidup Bandung', 'blh@bandung.go.id');

-- Seed users (100 fake citizens)
INSERT INTO users (nik, name) VALUES
    ('3201234567890001', 'Ahmad Rizki Pratama'),
    ('3201234567890002', 'Siti Nurhaliza'),
    ('3201234567890003', 'Budi Santoso'),
    ('3201234567890004', 'Dewi Lestari'),
    ('3201234567890005', 'Eko Prasetyo');
    -- Add 95 more...