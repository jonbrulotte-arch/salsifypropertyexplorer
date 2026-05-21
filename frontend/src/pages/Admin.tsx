import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { AdminSettings } from '../api'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h2 className="text-base font-semibold text-slate-800 mb-4">{title}</h2>
      {children}
    </div>
  )
}

export default function Admin() {
  const qc = useQueryClient()

  const { data: attributes = [] } = useQuery({
    queryKey: ['attributes-all'],
    queryFn: () => fetch('/api/attributes?include_hidden=true').then(r => r.json()),
  })

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: api.getAdminSettings,
  })

  const [draft, setDraft] = useState<AdminSettings | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [newAliasKey, setNewAliasKey] = useState('')
  const [newAliasVal, setNewAliasVal] = useState('')

  useEffect(() => {
    if (settings && !draft) setDraft(settings)
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: api.saveAdminSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] })
      qc.invalidateQueries({ queryKey: ['attributes'] })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    },
    onError: () => setSaveStatus('error'),
  })

  function save() {
    if (!draft) return
    setSaveStatus('saving')
    saveMutation.mutate(draft)
  }

  if (isLoading || !draft) {
    return <div className="text-center py-16 text-slate-400 text-sm">Loading settings…</div>
  }

  function toggleHidden(propId: string) {
    setDraft(d => {
      if (!d) return d
      const hidden = d.hidden_properties.includes(propId)
        ? d.hidden_properties.filter(p => p !== propId)
        : [...d.hidden_properties, propId]
      return { ...d, hidden_properties: hidden }
    })
  }

  function toggleHighlighted(propId: string) {
    setDraft(d => {
      if (!d) return d
      const hl = d.highlighted_properties.includes(propId)
        ? d.highlighted_properties.filter(p => p !== propId)
        : [...d.highlighted_properties, propId]
      return { ...d, highlighted_properties: hl }
    })
  }

  function addAlias() {
    if (!newAliasKey || !newAliasVal) return
    setDraft(d => d ? { ...d, property_aliases: { ...d.property_aliases, [newAliasKey]: newAliasVal } } : d)
    setNewAliasKey('')
    setNewAliasVal('')
  }

  function removeAlias(key: string) {
    setDraft(d => {
      if (!d) return d
      const aliases = { ...d.property_aliases }
      delete aliases[key]
      return { ...d, property_aliases: aliases }
    })
  }

  function removePreset(name: string) {
    setDraft(d => d ? { ...d, filter_presets: d.filter_presets.filter(p => p.name !== name) } : d)
  }

  // Group attributes for the hidden/highlighted panels
  const groups: Record<string, typeof attributes> = {}
  for (const a of attributes) {
    const g = a.group ?? 'Unassigned'
    if (!groups[g]) groups[g] = []
    groups[g].push(a)
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Admin Settings</h1>
        <button
          onClick={save}
          disabled={saveStatus === 'saving'}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            saveStatus === 'saved'
              ? 'bg-green-600 text-white'
              : saveStatus === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          } disabled:opacity-50`}
        >
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save Changes'}
        </button>
      </div>

      {/* General Settings */}
      <Section title="General">
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Exclude child products by default</span>
            <input
              type="checkbox"
              checked={draft.exclude_children_by_default}
              onChange={e => setDraft(d => d ? { ...d, exclude_children_by_default: e.target.checked } : d)}
              className="rounded text-indigo-600"
            />
          </label>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-700">Default report sort:</span>
            <select
              value={draft.report_default_sort}
              onChange={e => setDraft(d => d ? { ...d, report_default_sort: e.target.value as AdminSettings['report_default_sort'] } : d)}
              className="border border-slate-200 rounded px-2 py-1 text-sm text-slate-700"
            >
              <option value="coverage_desc">Coverage ↓</option>
              <option value="coverage_asc">Coverage ↑</option>
              <option value="name_asc">Name A–Z</option>
              <option value="name_desc">Name Z–A</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-700">Min report coverage:</span>
            <input
              type="range" min={0} max={100} step={5}
              value={draft.report_min_coverage_pct}
              onChange={e => setDraft(d => d ? { ...d, report_min_coverage_pct: Number(e.target.value) } : d)}
              className="w-32"
            />
            <span className="text-sm text-slate-500 tabular-nums">{draft.report_min_coverage_pct}%</span>
          </div>
        </div>
      </Section>

      {/* Product List Customizer */}
      <Section title="Product List Columns">
        <p className="text-xs text-slate-500 mb-4">Choose which columns appear in the Product List and their order. The ID column is always shown first.</p>
        <div className="space-y-2 mb-4">
          {(draft.product_list_columns ?? []).map((col, i) => (
            <div key={col} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
              <span className="flex-1 text-sm text-slate-700">{col}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setDraft(d => {
                    if (!d) return d
                    const cols = [...d.product_list_columns]
                    if (i === 0) return d
                    ;[cols[i - 1], cols[i]] = [cols[i], cols[i - 1]]
                    return { ...d, product_list_columns: cols }
                  })}
                  disabled={i === 0}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => setDraft(d => {
                    if (!d) return d
                    const cols = [...d.product_list_columns]
                    if (i === cols.length - 1) return d
                    ;[cols[i], cols[i + 1]] = [cols[i + 1], cols[i]]
                    return { ...d, product_list_columns: cols }
                  })}
                  disabled={i === (draft.product_list_columns ?? []).length - 1}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  onClick={() => setDraft(d => d ? { ...d, product_list_columns: d.product_list_columns.filter((_, j) => j !== i) } : d)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  title="Remove column"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {(draft.product_list_columns ?? []).length === 0 && (
            <p className="text-xs text-slate-400">No columns selected — add one below.</p>
          )}
        </div>
        <div className="flex gap-2">
          <select
            id="new-col-select"
            defaultValue=""
            className="flex-1 border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700"
          >
            <option value="">Add a column…</option>
            {attributes
              .filter((a: { id: string }) => !(draft.product_list_columns ?? []).includes(a.id))
              .map((a: { id: string; display_name: string }) => (
                <option key={a.id} value={a.id}>{a.display_name}</option>
              ))}
          </select>
          <button
            onClick={() => {
              const sel = document.getElementById('new-col-select') as HTMLSelectElement
              if (!sel.value) return
              setDraft(d => d ? { ...d, product_list_columns: [...(d.product_list_columns ?? []), sel.value] } : d)
              sel.value = ''
            }}
            className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
          >
            Add
          </button>
        </div>
      </Section>

      {/* Property Visibility */}
      <Section title="Property Visibility">
        <p className="text-xs text-slate-500 mb-4">Hidden properties won't appear in the filter builder. Highlighted properties are starred in reports.</p>
        <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
          {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([group, attrs]) => (
            <div key={group}>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{group}</div>
              <div className="space-y-1">
                {attrs.map((a: { id: string; display_name: string }) => (
                  <div key={a.id} className="flex items-center justify-between py-0.5">
                    <span className="text-sm text-slate-700">{a.display_name}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={draft.highlighted_properties.includes(a.id)}
                          onChange={() => toggleHighlighted(a.id)}
                          className="rounded text-yellow-500"
                        />
                        Highlight
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={draft.hidden_properties.includes(a.id)}
                          onChange={() => toggleHidden(a.id)}
                          className="rounded text-red-500"
                        />
                        Hide
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Property Aliases */}
      <Section title="Property Aliases">
        <p className="text-xs text-slate-500 mb-4">Override how property names appear in the UI.</p>
        <div className="space-y-2 mb-4">
          {Object.entries(draft.property_aliases).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 w-48 truncate">{key}</span>
              <span className="text-slate-300">→</span>
              <span className="text-slate-800 flex-1">{val}</span>
              <button onClick={() => removeAlias(key)} className="text-slate-400 hover:text-red-500 text-xs">Remove</button>
            </div>
          ))}
          {Object.keys(draft.property_aliases).length === 0 && (
            <p className="text-xs text-slate-400">No aliases configured.</p>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={newAliasKey}
            onChange={e => setNewAliasKey(e.target.value)}
            className="flex-1 border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700"
          >
            <option value="">Select property…</option>
            {attributes.map((a: { id: string; display_name: string }) => (
              <option key={a.id} value={a.id}>{a.display_name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Display name…"
            value={newAliasVal}
            onChange={e => setNewAliasVal(e.target.value)}
            className="flex-1 border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700"
          />
          <button
            onClick={addAlias}
            className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
          >
            Add
          </button>
        </div>
      </Section>

      {/* Filter Presets */}
      <Section title="Filter Presets">
        <p className="text-xs text-slate-500 mb-4">
          Save presets from the Explorer using the <span className="font-medium text-slate-600">Save as Preset</span> button. Presets appear as quick-load buttons above the filter rows.
        </p>
        <div className="space-y-2">
          {draft.filter_presets.map(p => (
            <div key={p.name} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-slate-700">{p.name}</span>
                <span className="ml-2 text-slate-400 text-xs">{p.filters.length} filter{p.filters.length !== 1 ? 's' : ''}</span>
                {p.filters.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {p.filters.map((f, i) => (
                      <li key={i} className="text-xs text-slate-400">
                        {f.property} {f.operator} {f.value != null ? String(f.value) : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button onClick={() => removePreset(p.name)} className="ml-4 shrink-0 text-slate-400 hover:text-red-500 text-xs transition-colors">Remove</button>
            </div>
          ))}
          {draft.filter_presets.length === 0 && (
            <p className="text-xs text-slate-400">No presets saved yet. Build a filter in the Explorer and click <span className="font-medium">Save as Preset</span>.</p>
          )}
        </div>
      </Section>
    </div>
  )
}
