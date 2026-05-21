import type { AttributeInfo, FilterCondition, FilterPreset } from '../api'
import FilterRow from './FilterRow'

interface Props {
  filters: FilterCondition[]
  attributes: AttributeInfo[]
  includeChildren: boolean
  presets: FilterPreset[]
  onFiltersChange: (filters: FilterCondition[]) => void
  onIncludeChildrenChange: (val: boolean) => void
  onLoadPreset: (preset: FilterPreset) => void
}

export default function FilterBuilder({
  filters, attributes, includeChildren, presets,
  onFiltersChange, onIncludeChildrenChange, onLoadPreset,
}: Props) {
  function addFilter() {
    const first = attributes[0]
    onFiltersChange([...filters, { property: first?.id ?? '', operator: 'equals', value: '' }])
  }

  function updateFilter(index: number, filter: FilterCondition) {
    const updated = [...filters]
    updated[index] = filter
    onFiltersChange(updated)
  }

  function removeFilter(index: number) {
    onFiltersChange(filters.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {/* Presets */}
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 self-center">Presets:</span>
          {presets.map(p => (
            <button
              key={p.name}
              onClick={() => onLoadPreset(p)}
              className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded border border-indigo-200 hover:bg-indigo-100 transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Filter rows */}
      <div className="space-y-2">
        {filters.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">
            No filters — showing all products
          </div>
        ) : (
          filters.map((f, i) => (
            <FilterRow
              key={i}
              filter={f}
              index={i}
              attributes={attributes}
              onChange={updateFilter}
              onRemove={removeFilter}
            />
          ))
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={addFilter}
          disabled={attributes.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Filter
        </button>

        {filters.length > 0 && (
          <button
            onClick={() => onFiltersChange([])}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Clear all
          </button>
        )}

        <label className="flex items-center gap-2 ml-auto text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeChildren}
            onChange={e => onIncludeChildrenChange(e.target.checked)}
            className="rounded text-indigo-600"
          />
          Include child products
        </label>
      </div>
    </div>
  )
}
