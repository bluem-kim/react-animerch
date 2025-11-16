import { useEffect, useMemo, useState } from 'react';
import { api } from '../../utils/api';
import { useTGAlert } from '../../components/TGAlert';

export default function Reviews() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const alertApi = useTGAlert();

  const fetchRows = async () => {
    const res = await api.get('/reviews', { params: { page: 1, limit: 1000 } });
    setRows(res.data.items || []);
  };

  useEffect(() => { fetchRows(); }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter(r => !q || r.product?.name?.toLowerCase().includes(q) || r.user?.name?.toLowerCase().includes(q) || String(r.rating).includes(q));
  }, [rows, query]);

  const remove = async (id) => {
    const ok = await alertApi.confirm('Delete this review?', {
      title: 'Confirm Delete',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!ok) return;
    await api.delete(`/reviews/${id}`);
    await fetchRows();
    await alertApi.alert('Review deleted.', { title: 'Success', variant: 'success' });
  };

  const approve = async (id) => {
    await api.patch(`/reviews/${id}/approve`);
    await fetchRows();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-center">
        <h2 className="text-lg font-semibold">User Reviews</h2>
        <div className="sm:justify-self-end">
          <input value={query} onChange={(e)=> setQuery(e.target.value)} placeholder="Search product/user/rating" className="block w-full sm:max-w-xs md:max-w-sm lg:max-w-md rounded-md border-stroke px-3 py-2 text-sm shadow-default focus:border-indigo-500 focus:ring-indigo-500 dark:border-strokedark" />
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Product</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Rating</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Approved</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Comment</th>
              <th className="px-4 py-3 w-44 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map(r => (
              <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3 align-middle text-sm text-gray-600 dark:text-gray-300">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 align-middle text-sm font-medium text-gray-900 dark:text-gray-100">{r.product?.name || '—'}</td>
                <td className="px-4 py-3 align-middle text-sm text-gray-700 dark:text-gray-300">{r.user?.name || r.user?.email || '—'}</td>
                <td className="px-4 py-3 align-middle text-sm">{r.rating}</td>
                <td className="px-4 py-3 align-middle text-sm">
                  {r.approved ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300">Yes</span>
                  ) : (
                    <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">Pending</span>
                  )}
                </td>
                <td className="px-4 py-3 align-middle text-sm text-gray-600">{r.comment || '—'}</td>
                <td className="px-4 py-3 align-middle text-right whitespace-nowrap w-44">
                  <div className="inline-flex items-center justify-end gap-2">
                    {!r.approved && (
                      <button onClick={()=> approve(r._id)} className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-1.5 text-white shadow-default hover:bg-emerald-700 text-sm">Approve</button>
                    )}
                    <button onClick={()=> remove(r._id)} className="inline-flex items-center justify-center rounded-md bg-rose-600 px-3 py-1.5 text-white shadow-default hover:bg-rose-700 text-sm">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">No reviews.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
