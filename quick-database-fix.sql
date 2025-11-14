-- Quick fix for MagangTable form submission
-- Run this in Supabase SQL Editor

-- 1) Ensure tables exist with correct structure
CREATE TABLE IF NOT EXISTS siswa (
  nisn BIGINT PRIMARY KEY,
  nama VARCHAR(255),
  kelas VARCHAR(100),
  jurusan VARCHAR(255),
  email VARCHAR(255),
  telepon VARCHAR(20),
  alamat TEXT,
  jenis_kelamin VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dudi (
  id SERIAL PRIMARY KEY,
  perusahaan VARCHAR(255) NOT NULL,
  alamat TEXT,
  email VARCHAR(255),
  telepon VARCHAR(20),
  penanggung_jawab VARCHAR(255),
  kuota INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS magang (
  id SERIAL PRIMARY KEY,
  nisn BIGINT NOT NULL,
  dudi_id INTEGER,
  periode_mulai DATE,
  periode_selesai DATE,
  nilai INTEGER,
  status VARCHAR(50) DEFAULT 'berlangsung',
  status_pendaftaran VARCHAR(50) DEFAULT 'diterima',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2) Add sample DUDI if none exists
INSERT INTO dudi (perusahaan, alamat, email, telepon, penanggung_jawab, kuota) 
VALUES 
  ('PT. Test Company', 'Jl. Test No. 1', 'info@test.com', '021-1234567', 'Test Manager', 5)
ON CONFLICT DO NOTHING;

-- 3) Check current data
SELECT 'Current DUDI:' as info;
SELECT id, perusahaan, kuota FROM dudi;

SELECT 'Current Siswa:' as info;
SELECT nisn, nama, kelas FROM siswa LIMIT 5;

SELECT 'Current Magang:' as info;
SELECT id, nisn, dudi_id, status FROM magang LIMIT 5;









































































































































