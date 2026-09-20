export interface Education {
  degree: string
  school: string
  year: string
}

export interface Profile {
  full_name: string
  phone: string
  address: string
  github_url: string
  linkedin_url: string
  portfolio_url: string
  education: Education[]
  updated_at?: string
}

export interface Source {
  id: number
  title: string
  content: string
  created_at: string
  updated_at: string
}

export interface StatusOption {
  value: string
  label: string
}

export interface Application {
  id: number
  job_title: string
  company: string
  compensation: string
  job_url: string
  location: string
  job_description: string
  status: string
  used_cover_letter: 0 | 1
  applied_date: string
  created_at: string
  updated_at: string
  resume_id?: number | null
  cover_letter_id?: number | null
}

export interface GeneratedDocument {
  id: number
  application_id: number
  doc_type: 'resume' | 'cover_letter'
  structured_json: string
  html_snapshot: string
  source_ids_json: string
  created_at: string
  updated_at: string
}

export interface DuplicateCheckResult {
  duplicate: boolean
  application?: Application
}
