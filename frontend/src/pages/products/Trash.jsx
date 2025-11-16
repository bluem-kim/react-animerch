import { useEffect, useMemo, useState } from 'react';
import { api } from '../../utils/api';
import { useTGAlert } from '../../components/TGAlert';

export default function Trash() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const alertApi = useTGAlert();

  const fetchRows = async () => {
    const res = await api.get('/products', { params: { page: 1, limit: 1000, deleted: true } });
    setRows(res.data.items || []);
  };

  useEffect(() => { fetchRows(); }, []);

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const allChecked = rows.length && selected.size === rows.length;
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r._id)));
  };

  const restore = async (id) => {
    await api.put(`/products/${id}/restore`);
    await fetchRows();
    await alertApi.alert('Product restored from trash', { title: 'Success', variant: 'success' });
  };

  const bulkPurge = async () => {
    if (!selected.size) return;
    const ok = await alertApi.confirm(`Permanently delete ${selected.size} products? This cannot be undone.`, { title: 'Permanently Delete', variant: 'danger', confirmText: 'Delete', cancelText: 'Cancel' });
    if (!ok) return;
    await api.delete('/products/purge', { data: { ids: Array.from(selected) } });
    await fetchRows();
    setSelected(new Set());
    await alertApi.alert('Selected products have been permanently deleted.', { title: 'Success', variant: 'success' });
  };

  const purgeOne = async (id) => {
    const ok = await alertApi.confirm('Permanently delete this product? This cannot be undone.', { title: 'Permanently Delete', variant: 'danger', confirmText: 'Delete', cancelText: 'Cancel' });
    if (!ok) return;
    await api.delete(`/products/${id}/purge`);
    await fetchRows();
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    await alertApi.alert('Product has been permanently deleted.', { title: 'Success', variant: 'success' });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-center">
        <h2 className="text-lg font-semibold">Trash</h2>
        <div className="sm:justify-self-end">
          <button onClick={bulkPurge} disabled={!selected.size} className="inline-flex items-center justify-center rounded-md bg-rose-600 px-3 py-2 text-white shadow-default hover:bg-rose-700 disabled:opacity-50">Purge Selected</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3"><input type="checkbox" checked={!!rows.length && allChecked} onChange={toggleAll} className="h-4 w-4" /></th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Deleted</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Price</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map(r => (
              <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3"><input type="checkbox" checked={selected.has(r._id)} onChange={()=> toggle(r._id)} className="h-4 w-4" /></td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{r.deletedAt ? new Date(r.deletedAt).toLocaleString() : '—'}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{r.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{r.category}</td>
                <td className="px-4 py-3 text-sm">₱{r.price?.toFixed?.(2) ?? r.price}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-3">
                    <button onClick={()=> restore(r._id)} className="text-emerald-600 hover:text-emerald-800 text-sm">Restore</button>
                    <button onClick={()=> purgeOne(r._id)} className="text-rose-600 hover:text-rose-800 text-sm">Purge</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Trash is empty.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
