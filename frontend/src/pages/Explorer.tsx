import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '../api'
import type { FilterCondition, FilterRequest } from '../api'
import FilterBuilder from '../components/FilterBuilder'
import PropertyReport from '../components/PropertyReport'
import ProductTable, { exportProducts } from '../components/ProductTable'

const STORAGE_KEY = 'salsify-explorer-filters'

function loadSaved(): { filters: FilterCondition[]; includeChildren: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { filters: [], includeChildren: true }
}

export default function Explorer() {
  const qc = useQueryClient()
  const saved = loadSaved()

  const [filters, setFilters] = useState<FilterCondition[]>(saved.filters)
  const [includeChildren, setIncludeChildren] = useState(saved.includeChildren)
  const [, setPage] = useState(1)
  const [showProducts, setShowProducts] = useState(true)
  const [presetName, setPresetName] = useState('')
  const [showPresetInput, setShowPresetInput] = useState(false)
  const [presetSaved, setPresetSaved] = useState(false)
  const presetInputRef = useRef<HTMLInputElement>(null)

  // queryParams is the committed state that drives both queries.
  // Initialise from saved filters so results auto-load on return navigation.
  const [queryParams, setQueryParams] = useState<FilterRequest | null>(
    saved.filters.length > 0
      ? { filters: saved.filters, include_children: saved.includeChildren, page: 1, page_size: 50 }
      : null
  )

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ filters, includeChildren }))
    } catch {}
  }, [filters, includeChildren])

  useEffect(() => {
    if (showPresetInput) presetInputRef.current?.focus()
  }, [showPresetInput])

  const { data: attributes = [], isLoading: attrsLoading } = useQuery({
    queryKey: ['attributes'],
    queryFn: api.getAttributes,
  })

  const { data: adminSettings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: api.getAdminSettings,
  })

  // useQuery for filter + report: results are cached by queryParams, so
  // navigating away and back shows the last result instantly with no effect tricks.
  const filterQKey = ['products-filter', queryParams]
  const reportQKey = ['products-report', queryParams ? { filters: queryParams.filters, include_children: queryParams.include_children } : null]

  const { data: filterResult, isFetching: filterFetching } = useQuery({
    queryKey: filterQKey,
    queryFn: () => api.filterProducts(queryParams!),
    enabled: queryParams !== null,
    placeholderData: keepPreviousData,
  })

  const { data: reportResult, isFetching: reportFetching } = useQuery({
    queryKey: reportQKey,
    queryFn: () => api.getReport({
      filters: queryParams!.filters,
      include_children: queryParams!.include_children,
      page: 1,
      page_size: 50,
    }),
    enabled: queryParams !== null,
    placeholderData: keepPreviousData,
  })

  const exportMutation = useMutation({
    mutationFn: (req: FilterRequest) => api.filterProducts(req),
    onSuccess: (data) => exportProducts(data.columns, data.products, data.total),
  })

  const savePresetMutation = useMutation({
    mutationFn: api.saveAdminSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] })
      setPresetSaved(true)
      setShowPresetInput(false)
      setPresetName('')
      setTimeout(() => setPresetSaved(false), 2500)
    },
  })

  function runQuery() {
    const req: FilterRequest = { filters, include_children: includeChildren, page: 1, page_size: 50 }
    setPage(1)
    setQueryParams(req)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    setQueryParams(q => q ? { ...q, page: newPage } : null)
  }

  function handleExportAll() {
    if (!queryParams) return
    exportMutation.mutate({ filters: queryParams.filters, include_children: queryParams.include_children, page: 1, page_size: -1 })
  }

  function savePreset() {
    const name = presetName.trim()
    if (!name || !adminSettings) return
    const existing = adminSettings.filter_presets.filter(p => p.name !== name)
    savePresetMutation.mutate({
      ...adminSettings,
      filter_presets: [...existing, { name, filters }],
    })
  }

  const isLoading = filterFetching || reportFetching
  const hasRun = queryParams !== null

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

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {filters.length > 0 && (
            <div className="flex items-center gap-2">
              {showPresetInput ? (
                <>
                  <input
                    ref={presetInputRef}
                    type="text"
                    value={presetName}
                    onChange={e => setPresetName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') savePreset(); if (e.key === 'Escape') setShowPresetInput(false) }}
                    placeholder="Preset name…"
                    className="border border-slate-200 rounded-md px-2 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <button
                    onClick={savePreset}
                    disabled={!presetName.trim() || savePresetMutation.isPending}
                    className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setShowPresetInput(false); setPresetName('') }}
                    className="text-slate-400 hover:text-slate-600 text-sm"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowPresetInput(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Save as Preset
                </button>
              )}
              {presetSaved && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Preset saved!
                </span>
              )}
            </div>
          )}

          <button
            onClick={runQuery}
            disabled={isLoading || attributes.length === 0}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    columns={filterResult.columns}
                    total={filterResult.total}
                    page={filterResult.page}
                    pages={filterResult.pages}
                    pageSize={filterResult.page_size}
                    onPageChange={handlePageChange}
                    onExportAll={handleExportAll}
                    exportLoading={exportMutation.isPending}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!hasRun && (
        <div className="text-center py-16 text-slate-400 text-sm">
          Add filters above and click <span className="font-medium text-slate-500">Run Query</span> to generate a property report.
        </div>
      )}
    </div>
  )
}
