import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Home, ShoppingCart, Cog, MessageSquare } from 'lucide-react';
import HeroCover from './components/HeroCover';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import InventoryRecipes from './components/InventoryRecipes';
import WhatsAppLogs from './components/WhatsAppLogs';
import { ensureSeeded } from './components/db';

export default function App() {
  useEffect(() => {
    ensureSeeded();
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
        <div className="h-[55vh] w-full relative">
          <HeroCover />
          <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-6xl px-4 md:px-6">
            <div className="backdrop-blur-md bg-white/70 rounded-2xl shadow-xl border border-white/60 p-4 md:p-6 -mb-10">
              <NavBar />
            </div>
          </div>
        </div>

        <main className="max-w-6xl mx-auto px-4 md:px-6 pt-14 pb-24">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/inventory" element={<InventoryRecipes />} />
            <Route path="/whatsapp" element={<WhatsAppLogs />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function NavBar() {
  const linkBase =
    'inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-slate-700 hover:text-slate-900 transition bg-white/70 hover:bg-white border border-slate-200 shadow-sm';
  const activeBase = 'ring-2 ring-emerald-400';

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Juice Shop AI POS</h1>
        <p className="text-slate-600 text-sm">INR currency • Offline-friendly • WhatsApp integrated</p>
      </div>
      <nav className="flex flex-wrap items-center gap-2">
        <NavLink to="/" end className={({ isActive }) => `${linkBase} ${isActive ? activeBase : ''}`}>
          <Home className="w-4 h-4" /> Dashboard
        </NavLink>
        <NavLink to="/pos" className={({ isActive }) => `${linkBase} ${isActive ? activeBase : ''}`}>
          <ShoppingCart className="w-4 h-4" /> POS
        </NavLink>
        <NavLink to="/inventory" className={({ isActive }) => `${linkBase} ${isActive ? activeBase : ''}`}>
          <Cog className="w-4 h-4" /> Inventory & Recipes
        </NavLink>
        <NavLink to="/whatsapp" className={({ isActive }) => `${linkBase} ${isActive ? activeBase : ''}`}>
          <MessageSquare className="w-4 h-4" /> WhatsApp Logs
        </NavLink>
      </nav>
    </div>
  );
}
