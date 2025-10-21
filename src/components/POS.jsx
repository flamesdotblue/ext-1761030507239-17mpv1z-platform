import { useEffect, useMemo, useState } from 'react';
import { getAll, recordSale, logWhatsApp, recalcDynamicPrice, getDB } from './db';
import { Plus, Send } from 'lucide-react';

export default function POS() {
  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState({});
  const [inventory, setInventory] = useState({});
  const [cart, setCart] = useState([]);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [customerPhone, setCustomerPhone] = useState('');

  useEffect(() => {
    const load = async () => {
      const prods = await getAll('Products');
      const recs = await getAll('Recipes');
      const inv = await getAll('Inventory');
      setProducts(prods);
      setRecipes(Object.fromEntries(recs.map((r) => [r.productId, r])));
      setInventory(Object.fromEntries(inv.map((i) => [i.id, i])));
    };
    load();
  }, []);

  const total = useMemo(() => cart.reduce((acc, it) => acc + it.price * it.qty, 0), [cart]);

  const addToCart = (prod) => {
    setCart((c) => {
      const existing = c.find((x) => x.id === prod.id);
      if (existing) {
        return c.map((x) => (x.id === prod.id ? { ...x, qty: x.qty + 1 } : x));
      }
      return [...c, { id: prod.id, productName: prod.name, price: prod.price, qty: 1 }];
    });
  };

  const changeQty = (id, qty) => {
    setCart((c) => c.map((x) => (x.id === id ? { ...x, qty: Math.max(1, qty) } : x)));
  };

  const removeItem = (id) => setCart((c) => c.filter((x) => x.id !== id));

  const availableStockForProduct = (productId) => {
    const recipe = recipes[productId];
    if (!recipe) return 999;
    let max = Infinity;
    for (const ing of recipe.ingredients) {
      const inv = inventory[ing.id];
      if (!inv) return 0;
      const possible = Math.floor((inv.qty ?? 0) / ing.qty);
      max = Math.min(max, isFinite(possible) ? possible : 0);
    }
    return isFinite(max) ? max : 0;
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    const items = cart.map((c) => ({ productId: c.id, productName: c.productName, qty: c.qty, unitPrice: c.price }));
    const saleId = await recordSale({ items, total, paymentMode, customer: { phone: customerPhone || null } });

    // Send WhatsApp bill
    const message = `Thanks for visiting! Your total: ₹${total}. Items: ${items.map((i) => `${i.productName} x${i.qty}`).join(', ')}.`;
    if (customerPhone) {
      const clean = cleanPhone(customerPhone);
      const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      await logWhatsApp({ to: clean, message, context: 'Customer Bill' });
    }

    // refresh inventory
    const inv = await getAll('Inventory');
    setInventory(Object.fromEntries(inv.map((i) => [i.id, i])));

    setCart([]);
    alert(`Sale #${saleId} recorded. Total ₹${total}.`);
  };

  const handleRecalcPrice = async (productId) => {
    const { newPrice } = await recalcDynamicPrice(productId);
    const prods = await getAll('Products');
    setProducts(prods);
    alert(`New price set to ₹${newPrice}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Products</h2>
          <div className="text-slate-500 text-sm">Tap to add to cart</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map((p) => (
            <button key={p.id} onClick={() => addToCart(p)} className="text-left bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
              <div className="h-36 w-full bg-slate-100">
                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-3">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-slate-600">₹{p.price} • Stock: {availableStockForProduct(p.id)}</div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleRecalcPrice(p.id); }} className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">Dynamic Price</button>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
          <h3 className="text-lg font-semibold">Cart</h3>
          <div className="space-y-3 max-h-80 overflow-auto pr-2">
            {cart.length === 0 && <div className="text-slate-500 text-sm">No items yet.</div>}
            {cart.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <div className="font-medium">{it.productName}</div>
                  <div className="text-slate-500 text-sm">₹{it.price} each</div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} value={it.qty} onChange={(e) => changeQty(it.id, Number(e.target.value || 1))} className="w-16 border rounded-lg p-1 text-right" />
                  <button className="text-slate-500 text-sm" onClick={() => removeItem(it.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600">Payment</span>
              <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="border rounded-lg p-2">
                <option>Cash</option>
                <option>UPI</option>
                <option>Card</option>
              </select>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600">Customer WhatsApp</span>
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="e.g., 9876543210" className="border rounded-lg p-2 w-40" />
            </div>
            <div className="flex items-center justify-between font-semibold text-lg">
              <span>Total</span>
              <span>₹{total.toLocaleString('en-IN')}</span>
            </div>
            <button onClick={checkout} className="w-full mt-3 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl px-4 py-2 shadow">
              <Plus className="w-4 h-4" /> Complete Sale & Send Bill <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function cleanPhone(p) {
  const digits = (p || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`; // assume India
  return digits;
}
