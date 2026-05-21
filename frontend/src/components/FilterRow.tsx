import type { AttributeInfo, FilterCondition } from '../api'

const OPERATORS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  string: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
    { value: 'contains', label: 'contains' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  number: [
    { value: 'equals', label: '=' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
    { value: 'gte', label: '>=' },
    { value: 'lte', label: '<=' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  boolean: [
    { value: 'is_true', label: 'is true' },
    { value: 'is_false', label: 'is false' },
    { value: 'is_empty', label: 'is empty' },
  ],
  enumerated: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  default: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
    { value: 'contains', label: 'contains' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
}

const NO_VALUE_OPS = new Set(['is_empty', 'is_not_empty', 'is_true', 'is_false'])

interface Props {
  filter: FilterCondition
  index: number
  attributes: AttributeInfo[]
  onChange: (index: number, filter: FilterCondition) => void
  onRemove: (index: number) => void
}

export default function FilterRow({ filter, index, attributes, onChange, onRemove }: Props) {
  const attr = attributes.find(a => a.id === filter.property)
  const dataType = attr?.data_type ?? 'string'
  const operators = OPERATORS_BY_TYPE[dataType] ?? OPERATORS_BY_TYPE.default
  const noValue = NO_VALUE_OPS.has(filter.operator)

  function handlePropertyChange(propId: string) {
    const newAttr = attributes.find(a => a.id === propId)
    const newType = newAttr?.data_type ?? 'string'
    const ops = OPERATORS_BY_TYPE[newType] ?? OPERATORS_BY_TYPE.default
    onChange(index, { property: propId, operator: ops[0].value, value: '' })
  }

  function handleOperatorChange(op: string) {
    onChange(index, { ...filter, operator: op, value: NO_VALUE_OPS.has(op) ? undefined : (filter.value ?? '') })
  }

  function handleValueChange(val: string) {
    onChange(index, { ...filter, value: val })
  }

  // Group attributes for the dropdown
  const groups: Record<string, AttributeInfo[]> = {}
  for (const a of attributes) {
    if (!groups[a.group]) groups[a.group] = []
    groups[a.group].push(a)
  }

  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2">
      <span className="text-xs text-slate-400 font-mono w-5 text-center shrink-0">
        {index === 0 ? 'IF' : 'AND'}
      </span>

      {/* Property selector */}
      <select
        value={filter.property}
        onChange={e => handlePropertyChange(e.target.value)}
        className="flex-1 min-w-0 border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        <option value="">Select property…</option>
        {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([group, attrs]) => (
          <optgroup key={group} label={group}>
            {attrs.map(a => (
              <option key={a.id} value={a.id}>{a.display_name}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Operator selector */}
      <select
        value={filter.operator}
        onChange={e => handleOperatorChange(e.target.value)}
        className="border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        {operators.map(op => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {/* Value input */}
      {!noValue && (
        <div className="flex-1 min-w-0">
          {attr?.data_type === 'enumerated' && attr.enum_values.length > 0 ? (
            <select
              value={String(filter.value ?? '')}
              onChange={e => handleValueChange(e.target.value)}
              className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">Select value…</option>
              {attr.enum_values.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          ) : (
            <input
              type={attr?.data_type === 'number' ? 'number' : 'text'}
              value={String(filter.value ?? '')}
              onChange={e => handleValueChange(e.target.value)}
              placeholder="Enter value…"
              className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          )}
        </div>
      )}

      <button
        onClick={() => onRemove(index)}
        className="shrink-0 text-slate-400 hover:text-red-500 transition-colors p-1 rounded"
        title="Remove filter"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
