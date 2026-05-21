import type { ProductSummary } from '../api'

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  Discontinued: 'bg-red-100 text-red-700',
  Limited: 'bg-yellow-100 text-yellow-700',
  Future: 'bg-blue-100 text-blue-700',
  default: 'bg-slate-100 text-slate-600',
}

interface Props {
  products: ProductSummary[]
  total: number
  page: number
  pages: number
  pageSize: number
  onPageChange: (page: number) => void
}

export default function ProductTable({ products, total, page, pages, pageSize, onPageChange }: Props) {
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="space-y-3">
      <div className="text-xs text-slate-500">
        Showing {start}–{end} of {total.toLocaleString()} products
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="pb-2 pr-4 text-xs font-medium text-slate-500">ID</th>
              <th className="pb-2 pr-4 text-xs font-medium text-slate-500">Item Name</th>
              <th className="pb-2 pr-4 text-xs font-medium text-slate-500">Brand</th>
              <th className="pb-2 pr-4 text-xs font-medium text-slate-500">Category</th>
              <th className="pb-2 text-xs font-medium text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-2 pr-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                  {p.is_child && <span className="text-slate-300 mr-1">└</span>}
                  {p.id}
                </td>
                <td className="py-2 pr-4 text-slate-800 max-w-xs">
                  <span className="line-clamp-1">{p.item_name ?? '—'}</span>
                </td>
                <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{p.brand ?? '—'}</td>
                <td className="py-2 pr-4 text-slate-500 text-xs max-w-[200px]">
                  <span className="line-clamp-1">{p.jsp_category ?? '—'}</span>
                </td>
                <td className="py-2">
                  {p.inventory_status ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.inventory_status] ?? STATUS_COLORS.default}`}>
                      {p.inventory_status}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
