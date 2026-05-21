import type { ProductRow } from '../api'

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  Discontinued: 'bg-red-100 text-red-700',
  Limited: 'bg-yellow-100 text-yellow-700',
  Future: 'bg-blue-100 text-blue-700',
  default: 'bg-slate-100 text-slate-600',
}

const STATUS_COL = 'Inventory Status'

function exportProducts(columns: string[], products: ProductRow[], total: number) {
  const escape = (v: string | null | undefined) => {
    const s = v ?? ''
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  const lines = [
    `Salsify Property Explorer — Product List`,
    `Generated:,${new Date().toLocaleString()}`,
    `Total products:,${total.toLocaleString()}`,
    '',
    ['ID', ...columns].map(escape).join(','),
    ...products.map(p =>
      [p.id, ...columns.map(c => p.data[c] ?? '')].map(escape).join(',')
    ),
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `product-list-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  products: ProductRow[]
  columns: string[]
  total: number
  page: number
  pages: number
  pageSize: number
  onPageChange: (page: number) => void
  onExportAll: () => void
  exportLoading: boolean
}

export default function ProductTable({
  products, columns, total, page, pages, pageSize,
  onPageChange, onExportAll, exportLoading,
}: Props) {
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Showing {start}–{end} of {total.toLocaleString()} products
        </span>
        <button
          onClick={onExportAll}
          disabled={exportLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors disabled:opacity-50"
        >
          {exportLoading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          )}
          {exportLoading ? 'Exporting…' : `Export All ${total.toLocaleString()}`}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="pb-2 pr-4 text-xs font-medium text-slate-500 whitespace-nowrap">ID</th>
              {columns.map(col => (
                <th key={col} className="pb-2 pr-4 text-xs font-medium text-slate-500 whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-2 pr-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                  {p.is_child && <span className="text-slate-300 mr-1">└</span>}
                  {p.id}
                </td>
                {columns.map(col => {
                  const val = p.data[col]
                  if (col === STATUS_COL && val) {
                    return (
                      <td key={col} className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[val] ?? STATUS_COLORS.default}`}>
                          {val}
                        </span>
                      </td>
                    )
                  }
                  return (
                    <td key={col} className="py-2 pr-4 text-slate-700 max-w-xs">
                      <span className="line-clamp-1">{val ?? '—'}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-2 py-1 text-xs text-slate-600 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ‹ Prev
          </button>
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
            let pg: number
            if (pages <= 7) pg = i + 1
            else if (page <= 4) pg = i + 1
            else if (page >= pages - 3) pg = pages - 6 + i
            else pg = page - 3 + i
            return (
              <button
                key={pg}
                onClick={() => onPageChange(pg)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  pg === page
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {pg}
              </button>
            )
          })}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
            className="px-2 py-1 text-xs text-slate-600 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  )
}

export { exportProducts }
