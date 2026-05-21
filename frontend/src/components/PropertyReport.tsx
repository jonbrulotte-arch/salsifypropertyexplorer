import { useState } from 'react'
import type { PropertyStat } from '../api'

type SortKey = 'coverage_desc' | 'coverage_asc' | 'name_asc' | 'name_desc'

interface Props {
  properties: PropertyStat[]
  totalProducts: number
  defaultSort: SortKey
}

const DATA_TYPE_COLORS: Record<string, string> = {
  string: 'bg-blue-50 text-blue-700',
  number: 'bg-green-50 text-green-700',
  boolean: 'bg-purple-50 text-purple-700',
  enumerated: 'bg-orange-50 text-orange-700',
  'digital_asset': 'bg-slate-100 text-slate-600',
  default: 'bg-slate-100 text-slate-600',
}

function CoverageBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-600 tabular-nums w-12 text-right">{pct.toFixed(1)}%</span>
    </div>
  )
}

export default function PropertyReport({ properties, defaultSort }: Props) {
  const [sort, setSort] = useState<SortKey>(defaultSort)
  const [groupByGroup, setGroupByGroup] = useState(false)
  const [minCoverage, setMinCoverage] = useState(0)
  const [search, setSearch] = useState('')

  const filtered = properties
    .filter(p => p.coverage_pct >= minCoverage)
    .filter(p => !search || p.display_name.toLowerCase().includes(search.toLowerCase()))

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'coverage_desc') return b.coverage_pct - a.coverage_pct
    if (sort === 'coverage_asc') return a.coverage_pct - b.coverage_pct
    if (sort === 'name_asc') return a.display_name.localeCompare(b.display_name)
    if (sort === 'name_desc') return b.display_name.localeCompare(a.display_name)
    return 0
  })

  function renderTable(rows: PropertyStat[]) {
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <th
              className="pb-2 pr-3 text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700"
              onClick={() => setSort(sort === 'name_asc' ? 'name_desc' : 'name_asc')}
            >
              Property {sort === 'name_asc' ? '↑' : sort === 'name_desc' ? '↓' : ''}
            </th>
            <th className="pb-2 pr-3 text-xs font-medium text-slate-500">Group</th>
            <th className="pb-2 pr-3 text-xs font-medium text-slate-500">Type</th>
            <th
              className="pb-2 text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700 w-48"
              onClick={() => setSort(sort === 'coverage_desc' ? 'coverage_asc' : 'coverage_desc')}
            >
              Coverage {sort === 'coverage_desc' ? '↓' : sort === 'coverage_asc' ? '↑' : ''}
            </th>
            <th className="pb-2 text-xs font-medium text-slate-500 text-right"># Products</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map(prop => (
            <tr key={prop.property_name} className={`hover:bg-slate-50 transition-colors ${prop.highlighted ? 'bg-yellow-50' : ''}`}>
              <td className="py-2 pr-3 font-medium text-slate-800">
                {prop.highlighted && <span className="mr-1 text-yellow-500" title="Highlighted">★</span>}
                {prop.display_name}
              </td>
              <td className="py-2 pr-3 text-slate-500 text-xs">{prop.group}</td>
              <td className="py-2 pr-3">
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${DATA_TYPE_COLORS[prop.data_type] ?? DATA_TYPE_COLORS.default}`}>
                  {prop.data_type}
                </span>
              </td>
              <td className="py-2 pr-2">
                <CoverageBar pct={prop.coverage_pct} />
              </td>
              <td className="py-2 text-right text-slate-600 tabular-nums">{prop.count.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="text-sm text-slate-400 text-center py-8">
        No properties found for this product set.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search properties…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-48"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="text-xs">Min coverage:</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minCoverage}
            onChange={e => setMinCoverage(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-xs tabular-nums w-8">{minCoverage}%</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={groupByGroup}
            onChange={e => setGroupByGroup(e.target.checked)}
            className="rounded text-indigo-600"
          />
          Group by category
        </label>
        <span className="text-xs text-slate-400">
          {sorted.length} of {properties.length} properties
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {groupByGroup ? (
          <div className="space-y-6">
            {Object.entries(
              sorted.reduce<Record<string, PropertyStat[]>>((acc, p) => {
                if (!acc[p.group]) acc[p.group] = []
                acc[p.group].push(p)
                return acc
              }, {})
            ).sort(([a], [b]) => a.localeCompare(b)).map(([group, rows]) => (
              <div key={group}>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{group}</h3>
                {renderTable(rows)}
              </div>
            ))}
          </div>
        ) : (
          renderTable(sorted)
        )}
      </div>
    </div>
  )
}
