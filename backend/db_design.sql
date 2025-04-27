-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Statuses table
CREATE TABLE statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

-- Priorities table
CREATE TABLE priorities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  target_response_time INTERVAL
);

-- Departments table
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  contact_email TEXT,
  contact_phone TEXT
);

-- Request Types table
CREATE TABLE request_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  avg_resolution_time INTERVAL
);

-- Request Type to Department mapping
CREATE TABLE request_type_department_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_type_id UUID NOT NULL REFERENCES request_types(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(request_type_id, department_id)
);

-- Service Requests table - main table for storing requests
CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  raw_input TEXT NOT NULL,
  summary TEXT NOT NULL,
  request_type_id UUID REFERENCES request_types(id),
  department_id UUID REFERENCES departments(id),
  status_id UUID NOT NULL REFERENCES statuses(id),
  priority_id UUID REFERENCES priorities(id),
  location GEOGRAPHY(POINT),
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_emergency BOOLEAN DEFAULT FALSE,
  is_valid BOOLEAN DEFAULT TRUE
);

-- Request History table for tracking status changes
CREATE TABLE request_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  status_id UUID NOT NULL REFERENCES statuses(id),
  notes TEXT,
  updated_by TEXT NOT NULL
);

-- AI Analysis Results table to store LLM processing details
CREATE TABLE ai_analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  triage_result JSONB DEFAULT '{}'::jsonb,
  validation_result JSONB DEFAULT '{}'::jsonb,
  classification_result JSONB DEFAULT '{}'::jsonb,
  geocoding_result JSONB DEFAULT '{}'::jsonb,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  processing_time INTERVAL
);

-- Create indexes for performance
CREATE INDEX service_requests_location_idx ON service_requests USING GIST (location);
CREATE INDEX service_requests_request_type_idx ON service_requests (request_type_id);
CREATE INDEX service_requests_department_idx ON service_requests (department_id);
CREATE INDEX service_requests_status_idx ON service_requests (status_id);
CREATE INDEX service_requests_priority_idx ON service_requests (priority_id);
CREATE INDEX service_requests_created_at_idx ON service_requests (created_at);
CREATE INDEX request_history_service_request_idx ON request_history (service_request_id);
CREATE INDEX ai_analysis_service_request_idx ON ai_analysis_results (service_request_id);

-- Create trigger to automatically update location point from lat/long
CREATE OR REPLACE FUNCTION update_location_from_coords()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_service_request_location
BEFORE INSERT OR UPDATE ON service_requests
FOR EACH ROW
EXECUTE FUNCTION update_location_from_coords();

-- Create function and trigger to log status changes in history
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.status_id IS DISTINCT FROM NEW.status_id) THEN
    INSERT INTO request_history 
      (service_request_id, status_id, updated_by) 
    VALUES 
      (NEW.id, NEW.status_id, 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_service_request_status
AFTER INSERT OR UPDATE ON service_requests
FOR EACH ROW
EXECUTE FUNCTION log_status_change();

-- Create views for reporting
CREATE OR REPLACE VIEW department_request_summary AS
SELECT 
  d.name AS department_name,
  rt.name AS request_type,
  s.name AS status,
  COUNT(*) AS request_count,
  AVG(EXTRACT(EPOCH FROM (NOW() - sr.created_at))/3600)::NUMERIC(10,2) AS avg_age_hours
FROM service_requests sr
JOIN departments d ON sr.department_id = d.id
JOIN request_types rt ON sr.request_type_id = rt.id
JOIN statuses s ON sr.status_id = s.id
GROUP BY d.name, rt.name, s.name;

CREATE OR REPLACE VIEW geospatial_request_summary AS
SELECT 
  sr.id,
  sr.summary,
  rt.name AS request_type,
  d.name AS department_name,
  s.name AS status,
  sr.latitude,
  sr.longitude,
  sr.created_at
FROM service_requests sr
JOIN departments d ON sr.department_id = d.id
JOIN request_types rt ON sr.request_type_id = rt.id
JOIN statuses s ON sr.status_id = s.id
WHERE sr.latitude IS NOT NULL AND sr.longitude IS NOT NULL;

-- Add Row-Level Security policies
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_type_department_mapping ENABLE ROW LEVEL SECURITY;