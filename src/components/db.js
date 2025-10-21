import { openDB } from 'idb';

const DB_NAME = 'juice_shop_ai_pos';
const DB_VERSION = 1;

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('Products')) {
        const store = db.createObjectStore('Products', { keyPath: 'id', autoIncrement: false });
        store.createIndex('by_name', 'name', { unique: false });
      }
      if (!db.objectStoreNames.contains('Inventory')) {
        const store = db.createObjectStore('Inventory', { keyPath: 'id', autoIncrement: false });
        store.createIndex('by_name', 'name', { unique: false });
      }
      if (!db.objectStoreNames.contains('Recipes')) {
        db.createObjectStore('Recipes', { keyPath: 'productId' });
      }
      if (!db.objectStoreNames.contains('Sales')) {
        const store = db.createObjectStore('Sales', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by_date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('Customers')) {
        db.createObjectStore('Customers', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('AI_Predictions')) {
        const store = db.createObjectStore('AI_Predictions', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by_date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('WhatsApp_Logs')) {
        const store = db.createObjectStore('WhatsApp_Logs', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by_date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('Settings')) {
        db.createObjectStore('Settings', { keyPath: 'key' });
      }
    }
  });
}

export async function ensureSeeded() {
  const db = await getDB();
  const seeded = await db.get('Settings', 'seeded');
  if (seeded?.value) return;

  const inventory = [
    { id: 'mango', name: 'Mango', unit: 'kg', qty: 20, reorderLevel: 5, costPerUnit: 120 },
    { id: 'sugar', name: 'Sugar', unit: 'kg', qty: 10, reorderLevel: 2, costPerUnit: 45 },
    { id: 'ice', name: 'Ice', unit: 'kg', qty: 30, reorderLevel: 5, costPerUnit: 5 },
    { id: 'milk', name: 'Milk', unit: 'L', qty: 15, reorderLevel: 5, costPerUnit: 60 },
    { id: 'cup', name: 'Cups', unit: 'pcs', qty: 200, reorderLevel: 50, costPerUnit: 2 },
  ];

  const products = [
    { id: 'mango-shake', name: 'Mango Shake', price: 120, image: 'https://images.unsplash.com/photo-1619898804188-e7bad4bd2127?ixid=M3w3OTkxMTl8MHwxfHNlYXJjaHwxfHxNYW5nbyUyMFNoYWtlfGVufDB8MHx8fDE3NjEwMzA2MzZ8MA&ixlib=rb-4.1.0&w=1600&auto=format&fit=crop&q=80', markup: 0.35 },
    { id: 'mango-juice', name: 'Mango Juice', price: 90, image: 'https://images.unsplash.com/photo-1524156868115-e696b44983db?ixid=M3w3OTkxMTl8MHwxfHNlYXJjaHwxfHxNYW5nbyUyMEp1aWNlfGVufDB8MHx8fDE3NjEwMzA3Nzh8MA&ixlib=rb-4.1.0&w=1600&auto=format&fit=crop&q=80', markup: 0.3 },
    { id: 'sweet-lassi', name: 'Sweet Lassi', price: 80, image: 'https://images.unsplash.com/photo-1623428450306-9ddfe75306d8?q=80&w=1200&auto=format&fit=crop', markup: 0.28 },
  ];

  const recipes = [
    { productId: 'mango-shake', ingredients: [ { id: 'mango', qty: 0.25 }, { id: 'milk', qty: 0.25 }, { id: 'sugar', qty: 0.03 }, { id: 'ice', qty: 0.1 }, { id: 'cup', qty: 1 } ] },
    { productId: 'mango-juice', ingredients: [ { id: 'mango', qty: 0.3 }, { id: 'sugar', qty: 0.03 }, { id: 'ice', qty: 0.1 }, { id: 'cup', qty: 1 } ] },
    { productId: 'sweet-lassi', ingredients: [ { id: 'milk', qty: 0.3 }, { id: 'sugar', qty: 0.04 }, { id: 'ice', qty: 0.08 }, { id: 'cup', qty: 1 } ] },
  ];

  const tx = db.transaction(['Inventory', 'Products', 'Recipes', 'Settings'], 'readwrite');
  await Promise.all(inventory.map((i) => tx.objectStore('Inventory').put(i)));
  await Promise.all(products.map((p) => tx.objectStore('Products').put(p)));
  await Promise.all(recipes.map((r) => tx.objectStore('Recipes').put(r)));
  await tx.done;

  await db.put('Settings', { key: 'seeded', value: true });
}

export async function getAll(storeName) {
  const db = await getDB();
  return db.getAll(storeName);
}

export async function putOne(storeName, value) {
  const db = await getDB();
  return db.put(storeName, value);
}

export async function deleteOne(storeName, key) {
  const db = await getDB();
  return db.delete(storeName, key);
}

export async function recordSale({ items, total, paymentMode, customer }) {
  const db = await getDB();
  const date = new Date().toISOString();
  const sale = { date, items, total, paymentMode, customer };

  const tx = db.transaction(['Sales', 'Inventory', 'Recipes'], 'readwrite');
  const saleId = await tx.objectStore('Sales').add(sale);

  // deduct inventory based on recipes
  const recipes = await Promise.all(items.map((it) => tx.objectStore('Recipes').get(it.productId)));
  const inventoryStore = tx.objectStore('Inventory');

  for (let i = 0; i < items.length; i++) {
    const recipe = recipes[i];
    const qtyMultiplier = items[i].qty;
    if (recipe) {
      for (const ing of recipe.ingredients) {
        const inv = await inventoryStore.get(ing.id);
        if (!inv) continue;
        const newQty = Math.max(0, (inv.qty ?? 0) - ing.qty * qtyMultiplier);
        await inventoryStore.put({ ...inv, qty: newQty });
      }
    }
  }

  await tx.done;
  return saleId;
}

export async function logWhatsApp({ to, message, context }) {
  const db = await getDB();
  const date = new Date().toISOString();
  const entry = { to, message, context, date, status: 'sent' };
  await db.add('WhatsApp_Logs', entry);
}

export async function upsertPrediction(pred) {
  const db = await getDB();
  await db.add('AI_Predictions', pred);
}

export async function recalcDynamicPrice(productId) {
  const db = await getDB();
  const product = await db.get('Products', productId);
  const recipe = await db.get('Recipes', productId);
  const inventory = db.transaction('Inventory');
  let cost = 0;
  for (const ing of recipe.ingredients) {
    const inv = await (await inventory).objectStore('Inventory').get(ing.id);
    if (inv) {
      cost += (inv.costPerUnit ?? 0) * ing.qty;
    }
  }
  const markup = product.markup ?? 0.3;
  const newPrice = Math.ceil(cost * (1 + markup) / 5) * 5; // round to nearest ₹5
  await db.put('Products', { ...product, price: newPrice, lastCost: cost });
  return { newPrice, cost };
}
