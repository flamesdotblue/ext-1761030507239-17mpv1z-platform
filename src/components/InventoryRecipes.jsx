import { useEffect, useMemo, useState } from 'react';
import { getAll, putOne, deleteOne, recalcDynamicPrice, getDB } from './db';
import { Save, Trash, RefreshCcw } from 'lucide-react';

export default function InventoryRecipes() {
  const [inventory, setInventory] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const load = async () => {
      const inv = await getAll('Inventory');
      const recs = await getAll('Recipes');
      const prods = await getAll('Products');
      setInventory(inv);
      setRecipes(recs);
      setProducts(prods);
    };
    load();
  }, []);

  const updateInv = async (item) => {
    await putOne('Inventory', item);
    const inv = await getAll('Inventory');
    setInventory(inv);
  };

  const updateRecipe = async (r) => {
    await putOne('Recipes', r);
    setRecipes(await getAll('Recipes'));
  };

  const lowStock = useMemo(() => inventory.filter((i) => i.qty <= i.reorderLevel), [inventory]);

  return (
    <div className="space-y-10">
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Inventory</h2>
          <div className="text-sm text-slate-500">Low stock: {lowStock.length}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-3">Item</th>
                <th className="py-2 pr-3">Qty</th>
                <th className="py-2 pr-3">Unit</th>
                <th className="py-2 pr-3">Reorder</th>
                <th className="py-2 pr-3">Cost/Unit (₹)</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inventory.map((i) => (
                <tr key={i.id}>
                  <td className="py-2 pr-3 font-medium">{i.name}</td>
                  <td className="py-2 pr-3"><input type="number" value={i.qty} className="w-24 border rounded-lg p-1" onChange={(e) => setInventory((prev) => prev.map((x) => x.id === i.id ? { ...x, qty: Number(e.target.value) } : x))} /></td>
                  <td className="py-2 pr-3 text-slate-500">{i.unit}</td>
                  <td className="py-2 pr-3"><input type="number" value={i.reorderLevel} className="w-24 border rounded-lg p-1" onChange={(e) => setInventory((prev) => prev.map((x) => x.id === i.id ? { ...x, reorderLevel: Number(e.target.value) } : x))} /></td>
                  <td className="py-2 pr-3"><input type="number" value={i.costPerUnit ?? 0} className="w-28 border rounded-lg p-1" onChange={(e) => setInventory((prev) => prev.map((x) => x.id === i.id ? { ...x, costPerUnit: Number(e.target.value) } : x))} /></td>
                  <td className="py-2 pr-3">
                    <button className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1 mr-2" onClick={() => updateInv(i)}><Save className="w-4 h-4" /> Save</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recipes</h2>
          <div className="text-sm text-slate-500">Edit proportions to auto-update cost</div>
        </div>
        <div className="space-y-6">
          {products.map((p) => {
            const r = recipes.find((x) => x.productId === p.id) || { productId: p.id, ingredients: [] };
            const cost = r.ingredients.reduce((acc, ing) => {
              const inv = inventory.find((x) => x.id === ing.id);
              return acc + ((inv?.costPerUnit ?? 0) * ing.qty);
            }, 0);
            return (
              <div key={p.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm text-slate-600">Current Price: ₹{p.price} • Est. Cost: ₹{Math.round(cost)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={async () => { await recalcDynamicPrice(p.id); alert('Price recalculated from costs.'); }} className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg px-3 py-1"><RefreshCcw className="w-4 h-4" /> Reprice</button>
                  </div>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-1 pr-3">Ingredient</th>
                        <th className="py-1 pr-3">Qty</th>
                        <th className="py-1 pr-3">Unit</th>
                        <th className="py-1 pr-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.ingredients.map((ing, idx) => {
                        const inv = inventory.find((x) => x.id === ing.id);
                        return (
                          <tr key={idx}>
                            <td className="py-1 pr-3">
                              <select value={ing.id} className="border rounded-lg p-1" onChange={(e) => {
                                const newIng = { ...ing, id: e.target.value };
                                const newR = { ...r, ingredients: r.ingredients.map((x, i) => (i === idx ? newIng : x)) };
                                setRecipes((prev) => prev.map((x) => x.productId === r.productId ? newR : x));
                              }}>
                                {inventory.map((inv) => (
                                  <option key={inv.id} value={inv.id}>{inv.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-1 pr-3"><input type="number" step="0.01" value={ing.qty} className="w-24 border rounded-lg p-1" onChange={(e) => {
                              const newIng = { ...ing, qty: Number(e.target.value) };
                              const newR = { ...r, ingredients: r.ingredients.map((x, i) => (i === idx ? newIng : x)) };
                              setRecipes((prev) => prev.map((x) => x.productId === r.productId ? newR : x));
                            }} /></td>
                            <td className="py-1 pr-3 text-slate-500">{inv?.unit}</td>
                            <td className="py-1 pr-3">
                              <button className="inline-flex items-center gap-1 text-rose-600" onClick={() => {
                                const newR = { ...r, ingredients: r.ingredients.filter((_, i) => i !== idx) };
                                setRecipes((prev) => prev.map((x) => x.productId === r.productId ? newR : x));
                              }}>
                                <Trash className="w-4 h-4" /> Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="mt-2 flex items-center gap-2">
                    <button className="px-3 py-1 rounded-lg border border-slate-200" onClick={() => {
                      const newR = { ...r, ingredients: [...r.ingredients, { id: inventory[0]?.id, qty: 0 }] };
                      setRecipes((prev) => {
                        const exists = prev.some((x) => x.productId === r.productId);
                        return exists ? prev.map((x) => (x.productId === r.productId ? newR : x)) : [...prev, newR];
                      });
                    }}>Add Ingredient</button>
                    <button className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1" onClick={() => updateRecipe(r)}>
                      <Save className="w-4 h-4" /> Save Recipe
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
