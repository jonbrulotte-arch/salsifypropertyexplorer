export interface AttributeInfo {
  id: string
  name: string
  display_name: string
  group: string
  data_type: string
  is_facetable: boolean
  enum_values: string[]
}

export interface FilterCondition {
  property: string
  operator: string
  value?: string | number | boolean | null
}

export interface FilterRequest {
  filters: FilterCondition[]
  include_children: boolean
  page: number
  page_size: number
}

export interface ProductRow {
  id: string
  is_child: boolean
  data: Record<string, string | null>
}

export interface FilterResponse {
  total: number
  page: number
  page_size: number
  pages: number
  columns: string[]
  products: ProductRow[]
}

export interface PropertyStat {
  property_name: string
  display_name: string
  group: string
  data_type: string
  count: number
  coverage_pct: number
  highlighted: boolean
}

export interface ReportResponse {
  total_products: number
  properties: PropertyStat[]
}

export interface FilterPreset {
  name: string
  filters: FilterCondition[]
}

export interface AdminSettings {
  hidden_properties: string[]
  property_aliases: Record<string, string>
  report_min_coverage_pct: number
  report_default_sort: 'coverage_desc' | 'coverage_asc' | 'name_asc' | 'name_desc'
  filter_presets: FilterPreset[]
  exclude_children_by_default: boolean
  highlighted_properties: string[]
  product_list_columns: string[]
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json()
}

export const api = {
  getAttributes: () => request<AttributeInfo[]>('/api/attributes'),
  filterProducts: (body: FilterRequest) =>
    request<FilterResponse>('/api/products/filter', { method: 'POST', body: JSON.stringify(body) }),
  getReport: (body: FilterRequest) =>
    request<ReportResponse>('/api/products/report', { method: 'POST', body: JSON.stringify(body) }),
  getAdminSettings: () => request<AdminSettings>('/api/admin/settings'),
  saveAdminSettings: (settings: AdminSettings) =>
    request<AdminSettings>('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) }),
}
