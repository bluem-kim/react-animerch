import { useEffect, useMemo, useState } from 'react';
import { api } from '../../utils/api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, trashed: 0, reviews: 0 });

  useEffect(() => {
    let active = true;
    (async () => {
      const [p, t, r] = await Promise.all([
        api.get('/products', { params: { page: 1, limit: 1 } }),
        api.get('/products', { params: { page: 1, limit: 1, deleted: true } }),
        api.get('/reviews', { params: { page: 1, limit: 1 } })
      ]);
      if (!active) return;
      setStats({ products: p.data.total || 0, trashed: t.data.total || 0, reviews: r.data.total || 0 });
    })();
    return () => { active = false; };
  }, []);

  // ---------- Sales stats (chart) ----------
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const yearStartISO = useMemo(() => {
    const n = new Date();
    const d = new Date(Date.UTC(n.getUTCFullYear(), 0, 1));
    return d.toISOString().slice(0, 10);
  }, []);
  const [start, setStart] = useState(yearStartISO);
  const [end, setEnd] = useState(todayISO);
  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);

  function parseISODate(s) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  function monthRange(startDate, endDate) {
    const out = [];
    const a = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
    const b = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let y = a.getUTCFullYear();
    let m = a.getUTCMonth();
    while (y < b.getUTCFullYear() || (y === b.getUTCFullYear() && m <= b.getUTCMonth())) {
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      const label = `${months[m]} ${y}`;
      out.push({ key, label, y, m: m + 1 });
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
    return out;
  }

  useEffect(() => {
    const s = parseISODate(start);
    const e = parseISODate(end);
    if (!s || !e || s > e) return;
    let alive = true;
    (async () => {
      try {
        setLoadingSales(true);
        const { data } = await api.get('/transactions/stats/sales', {
          params: { start, end, granularity: 'month' },
        });
        if (!alive) return;
        setSales(Array.isArray(data?.items) ? data.items : []);
      } finally {
        if (alive) setLoadingSales(false);
      }
    })();
    return () => { alive = false; };
  }, [start, end]);

  const chartData = useMemo(() => {
    const s = parseISODate(start);
    const e = parseISODate(end);
    if (!s || !e || s > e) return [];
    const buckets = monthRange(s, e);
    const map = new Map((sales || []).map(it => [it.label, it]));
    return buckets.map(b => {
      const key = `${b.y}-${String(b.m).padStart(2, '0')}`;
      const row = map.get(key);
      return {
        label: b.label,
        Sales: Number(row?.totalAmount || 0),
        Orders: Number(row?.orders || 0),
      };
    });
  }, [sales, start, end]);

  const currency = useMemo(() => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }), []);

  const Card = ({ title, value, color }) => (
    <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="text-sm text-gray-500 dark:text-gray-300">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</div>
      <div className={`mt-4 h-1 rounded ${color}`}></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Admin Dashboard</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Products" value={stats.products} color="bg-indigo-500" />
        <Card title="Reviews" value={stats.reviews} color="bg-emerald-500" />
        <Card title="In Trash" value={stats.trashed} color="bg-rose-500" />
      </div>
      <div className="rounded-sm border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Sales (Monthly)</div>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
            <label className="text-gray-600 dark:text-gray-300">Start</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
            <label className="ml-2 text-gray-600 dark:text-gray-300">End</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" stroke="#6b7280" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" stroke="#6b7280" tick={{ fontSize: 12 }} tickFormatter={(v) => currency.format(Number(v))} />
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v, n) => [n === 'Sales' ? currency.format(Number(v)) : v, n]} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="Sales" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="Orders" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {loadingSales && (
          <div className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">Loading sales…</div>
        )}
      </div>
    </div>
  );
}
