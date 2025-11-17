import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Snackbar, Alert } from '@mui/material';
import TGSelect from '../../components/TGSelect';
import { api } from '../../utils/api';
import { useTGAlert } from '../../components/TGAlert';

export default function ProductList() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const alertApi = useTGAlert();
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await api.get('/products', { params: { page: 1, limit: 1000 } });
      if (active) setRows(res.data.items || []);
    })();
    return () => { active = false; };
  }, []);

  // Show toast passed via navigation state then clear it
  useEffect(() => {
    const s = location.state;
    if (s?.toast?.msg) {
      setToast({ open: true, msg: s.toast.msg, severity: s.toast.severity || 'success' });
      // Clear state so it doesn't reappear on back/forward
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, location.pathname, navigate]);

  // Initialize category filter from URL (?category=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get('category') || '';
    setCategoryFilter(cat);
    setPage(1);
  }, [location.search]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(r => {
      const matchesQuery = !q || r.name?.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q);
      const matchesCategory = !categoryFilter || r.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [rows, query]);


  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      let va = a[sortBy];
      let vb = b[sortBy];
      if (sortBy === 'price') { va = Number(va); vb = Number(vb); }
      if (sortBy === 'createdAt') { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return copy;
  }, [filtered, sortBy, sortDir]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const allChecked = current.length && current.every(r => selected.has(r._id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allChecked) current.forEach(r => next.delete(r._id));
    else current.forEach(r => next.add(r._id));
    setSelected(next);
  };

  const bulkDelete = async () => {
    if (!selected.size) return;
    const ok = await alertApi.confirm(`Delete ${selected.size} products?`, { title: 'Confirm Delete', variant: 'warning', confirmText: 'Delete', cancelText: 'Cancel' });
    if (!ok) return;
    await api.delete('/products', { data: { ids: Array.from(selected) } });
    const res = await api.get('/products', { params: { page: 1, limit: 1000 } });
    setRows(res.data.items || []);
    setSelected(new Set());
    setPage(1);
    await alertApi.alert('Product deleted, stored in trash', { title: 'Success', variant: 'success' });
  };

  const deleteOne = async (id) => {
    const ok = await alertApi.confirm('Delete this product?', { title: 'Confirm Delete', variant: 'warning', confirmText: 'Delete', cancelText: 'Cancel' });
    if (!ok) return;
    await api.delete('/products', { data: { ids: [id] } });
    const res = await api.get('/products', { params: { page: 1, limit: 1000 } });
    setRows(res.data.items || []);
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setPage(1);
    await alertApi.alert('Product deleted, stored in trash', { title: 'Success', variant: 'success' });
  };

  const headerCell = (key, label) => (
    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
      <button className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100" onClick={() => {
        if (sortBy === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        else { setSortBy(key); setSortDir('asc'); }
      }}>
        {label}
        {sortBy === key && (
          <span className="text-gray-400">{sortDir === 'asc' ? '▲' : '▼'}</span>
        )}
      </button>
    </th>
  );

  return (
    <div className="space-y-4">
      {categoryFilter && (
        <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
          <div>Category: <span className="font-medium">{categoryFilter}</span></div>
          <button
            onClick={() => navigate('/admin/products')}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >Clear</button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-center">
        <h2 className="text-lg font-semibold">Products</h2>
        <div className="flex gap-2 sm:justify-end">
          <Link to="/admin/products/new" className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-white shadow-default hover:bg-indigo-700">New Product</Link>
          <button onClick={bulkDelete} disabled={!selected.size} className="inline-flex items-center justify-center rounded-md bg-rose-600 px-3 py-2 text-white shadow-default hover:bg-rose-700 disabled:opacity-50">Delete Selected</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-center">
        <input
          value={query}
          onChange={(e)=>{ setQuery(e.target.value); setPage(1); }}
          placeholder="Search name or category…"
          className="block w-full sm:max-w-xs md:max-w-sm lg:max-w-md rounded-md px-3 py-2 text-sm focus:ring-indigo-500"
        />
        <div className="flex items-center gap-2 text-sm text-gray-600 sm:justify-end">
          <span>{total} items</span>
          <TGSelect value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(1); }} className="w-28">
            {[10,20,50].map(n => <option key={n} value={n}>{n}/page</option>)}
          </TGSelect>
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={!!current.length && allChecked} onChange={toggleAll} className="h-4 w-4" />
              </th>
              {headerCell('createdAt','Created')}
              {headerCell('name','Name')}
              {headerCell('category','Category')}
              {headerCell('price','Price')}
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Photos</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {current.map(r => (
              <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3"><input type="checkbox" checked={selected.has(r._id)} onChange={() => toggle(r._id)} className="h-4 w-4" /></td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{r.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{r.category}</td>
                <td className="px-4 py-3 text-sm">₱{r.price?.toFixed?.(2) ?? r.price}</td>
                <td className="px-4 py-3">
                  <div className="flex -space-x-2">
                    {(r.photos || []).slice(0,3).map((p, idx) => (
                      <img key={idx} src={p.url} alt="" className="h-8 w-8 rounded object-cover ring-2 ring-white dark:ring-gray-900" />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-3">
                    <Link to={`/admin/products/${r._id}/edit`} className="text-indigo-600 hover:text-indigo-800 text-sm">Edit</Link>
                    <button onClick={() => deleteOne(r._id)} className="text-rose-600 hover:text-rose-800 text-sm">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!current.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm text-gray-600 dark:text-gray-300">Page {page} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <button onClick={()=> setPage(p => Math.max(1, p-1))} disabled={page===1} className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white shadow-default hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400">Prev</button>
            <button onClick={()=> setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white shadow-default hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400">Next</button>
          </div>
        </div>
      </div>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast(t => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setToast(t => ({ ...t, open: false }))} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </div>
  );
}
