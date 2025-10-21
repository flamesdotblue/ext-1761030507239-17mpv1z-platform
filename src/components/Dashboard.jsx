import { useEffect, useMemo, useState } from 'react';
import { getAll } from './db';
import { format } from 'date-fns';
import { Brain, Flame, PackageMinus } from 'lucide-react';

export default function Dashboard() {
  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [preds, setPreds] = useState([]);

  useEffect(() => {
    const load = async () => {
      const s = await getAll('Sales');
      const i = await getAll('Inventory');
      const p = await getAll('AI_Predictions');
      setSales(s.reverse());
      setInventory(i);
      setPreds(p.filter((x) => sameDay(new Date(x.date), new Date()) || isTomorrow(new Date(x.date))));
    };
    load();
  }, []);

  const todayTotal = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return sales
      .filter((s) => (s.date ?? '').startsWith(todayStr))
      .reduce((acc, s) => acc + (s.total ?? 0), 0);
  }, [sales]);

  const lowStock = useMemo(() => inventory.filter((i) => i.qty <= i.reorderLevel), [inventory]);

  const topJuice = useMemo(() => {
    const count = {};
    for (const s of sales) {
      for (const it of s.items ?? []) {
        count[it.productName] = (count[it.productName] ?? 0) + it.qty;
      }
    }
    let top = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
    return top ? { name: top[0], qty: top[1] } : null;
  }, [sales]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Today's Sales" subtitle="Gross revenue" icon={<Flame className="w-5 h-5 text-orange-500" />}>
          <div className="text-3xl font-semibold">₹{todayTotal.toLocaleString('en-IN')}</div>
          <div className="text-slate-500 text-sm">{format(new Date(), 'EEE, d MMM')}</div>
        </Card>
        <Card title="Low Stock Items" subtitle="Reorder suggested" icon={<PackageMinus className="w-5 h-5 text-rose-500" />}>
          <div className="space-y-1">
            {lowStock.length === 0 && <div className="text-slate-500">All good for today.</div>}
            {lowStock.map((i) => (
              <div key={i.id} className="flex justify-between text-sm">
                <span>{i.name}</span>
                <span className="text-rose-600 font-medium">{i.qty} {i.unit}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="AI Prediction Summary" subtitle="Tomorrow's forecast" icon={<Brain className="w-5 h-5 text-emerald-600" />}>
          <div className="space-y-1 max-h-28 overflow-auto pr-1">
            {preds.length === 0 && <div className="text-slate-500">No predictions yet.</div>}
            {preds.map((p) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span>{p.productName}</span>
                <span className="text-slate-700">{p.predictedUnits} cups <span className="text-slate-500">({Math.round((p.confidence ?? 0.8) * 100)}%)</span></span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <section className="bg-white/80 border border-slate-200 rounded-2xl shadow-sm p-5">
        <h2 className="text-lg font-semibold mb-3">Recent Sales</h2>
        <div className="divide-y">
          {sales.length === 0 && <div className="text-slate-500 text-sm">No sales recorded yet.</div>}
          {sales.slice(0, 8).map((s, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between text-sm">
              <div className="flex-1">
                <div className="font-medium">{format(new Date(s.date), 'd MMM, h:mm a')}</div>
                <div className="text-slate-500">{(s.items ?? []).map((i) => `${i.productName} x${i.qty}`).join(', ')}</div>
              </div>
              <div className="font-semibold">₹{(s.total ?? 0).toLocaleString('en-IN')}</div>
              <div className="text-slate-500">{s.paymentMode}</div>
            </div>
          ))}
        </div>
      </section>

      {topJuice && (
        <section className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Top Juice Today</h3>
              <p className="text-slate-600">{topJuice.name} • {topJuice.qty} cups sold</p>
            </div>
            <div className="text-sm text-slate-600">Tip: Keep enough ingredients ready for the evening rush.</div>
          </div>
        </section>
      )}
    </div>
  );
}

function Card({ title, subtitle, icon, children }) {
  return (
    <div className="bg-white/80 border border-slate-200 rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm text-slate-500">{subtitle}</div>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="bg-slate-100 rounded-xl p-2">{icon}</div>
      </div>
      {children}
    </div>
  );
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isTomorrow(d) {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return sameDay(d, t);
}
