export interface RoadmapRecord {
  id: number
  title: string
  content: string
  contentPTbr: string
  completed: boolean
  createdAt: string
}

export interface RoadmapResponse {
  records: RoadmapRecord[]
  total: number
}

export interface CheckboxStats {
  checked: number
  total: number
}
