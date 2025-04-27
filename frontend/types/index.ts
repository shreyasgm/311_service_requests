export type ServiceRequest = {
  id: string
  created_at: string
  raw_input: string
  summary: string
  request_type_id: string
  department_id: string
  status_id: string
  priority_id: string
  location: any // GeoJSON point
  address: string
  latitude: number
  longitude: number
  is_emergency: boolean
  is_valid: boolean

  // Joined fields
  request_type?: RequestType
  department?: Department
  status?: Status
  priority?: Priority
}

export type Department = {
  id: string
  name: string
  description: string
  contact_email: string
  contact_phone: string
}

export type RequestType = {
  id: string
  name: string
  description: string
  avg_resolution_time: string
}

export type Status = {
  id: string
  name: string
  description: string
}

export type Priority = {
  id: string
  name: string
  description: string
  target_response_time: string
}

export type RequestHistory = {
  id: string
  created_at: string
  service_request_id: string
  status_id: string
  notes: string
  updated_by: string
  status?: Status
}

export type AIAnalysisResult = {
  id: string
  service_request_id: string
  created_at: string
  triage_result: any
  validation_result: any
  classification_result: any
  geocoding_result: any
  confidence_scores: any
  processing_time: string
}

export type MapFilter = {
  status?: string[]
  department?: string[]
  requestType?: string[]
  priority?: string[]
  dateRange?: [Date | null, Date | null]
}

export type RequestStats = {
  totalRequests: number
  byStatus: { name: string; count: number }[]
  byDepartment: { name: string; count: number }[]
  byRequestType: { name: string; count: number }[]
  byPriority: { name: string; count: number }[]
  averageResolutionTime: number
}
