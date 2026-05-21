import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../api'
import type { FilterCondition, FilterRequest } from '../api'
import FilterBuilder from '../components/FilterBuilder'
import PropertyReport from '../components/PropertyReport'
import ProductTable from '../components/ProductTable'

export default function Explorer() {
  const [filters, setFilters] = useState<FilterCondition[]>([])
  const [includeChildren, setIncludeChildren] = useState(true)
  const [page, setPage] = useState(1)
  const [showProducts, setShowProducts] = useState(true)

  const { data: attributes = [], isLoading: attrsLoading } = useQuery({
    queryKey: ['attributes'],
    queryFn: api.getAttributes,
  })

  const { data: adminSettings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: api.getAdminSettings,
  })

  const filterReq: FilterRequest = { filters, include_children: includeChildren, page, page_size: 50 }

  const filterMutation = useMutation({
    mutationFn: (req: FilterRequest) => api.filterProducts(req),
  })

  const reportMutation = useMutation({
    mutationFn: (req: FilterRequest) => api.getReport(req),
  })

  function runQuery() {
    setPage(1)
    const req = { ...filterReq, page: 1 }
    filterMutation.mutate(req)
    reportMutation.mutate(req)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    filterMutation.mutate({ ...filterReq, page: newPage })
  }

  const isLoading = filterMutation.isPending || reportMutation.isPending
  const filterResult = filterMutation.data
  const reportResult = reportMutation.data
  const hasRun = filterResult !== undefined || reportResult !== undefined

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      {/* Filter Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">Filters</h2>
          {attrsLoading && (
            <span className="text-xs text-slate-400 animate-pulse">Loading attributes…</span>
          )}
        </div>
        <FilterBuilder
          filters={filters}
          attributes={attributes}
          includeChildren={includeChildren}
          presets={adminSettings?.filter_presets ?? []}
          onFiltersChange={f => { setFilters(f) }}
          onIncludeChildrenChange={v => { setIncludeChildren(v) }}
          onLoadPreset={preset => { setFilters(preset.filters) }}
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={runQuery}
            disabled={isLoading || attributes.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Running…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                Run Query
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {hasRun && (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-4 text-sm text-slate-600">
            {filterResult && (
              <span className="font-medium text-slate-800">
                {filterResult.total.toLocaleString()} products matched
              </span>
            )}
            {reportResult && (
              <span className="text-slate-500">
                {reportResult.properties.length} unique properties
              </span>
            )}
          </div>

          {/* Property Report */}
          {reportResult && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-base font-semibold text-slate-800 mb-4">Property Report</h2>
              <PropertyReport
                properties={reportResult.properties}
                totalProducts={reportResult.total_products}
                defaultSort={adminSettings?.report_default_sort ?? 'coverage_desc'}
              />
            </div>
          )}

          {/* Product List */}
          {filterResult && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <button
                onClick={() => setShowProducts(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <h2 className="text-base font-semibold text-slate-800">
                  Product List
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({filterResult.total.toLocaleString()})
                  </span>
                </h2>
                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform ${showProducts ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showProducts && (
                <div className="px-5 pb-5">
                  <ProductTable
                    products={filterResult.products}
                    total={filterResult.total}
                    page={filterResult.page}
                    pages={filterResult.pages}
                    pageSize={filterResult.page_size}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!hasRun && !isLoading && (
        <div className="text-center py-16 text-slate-400 text-sm">
          Add filters above and click <span className="font-medium text-slate-500">Run Query</span> to generate a property report.
        </div>
      )}
    </div>
  )
}
