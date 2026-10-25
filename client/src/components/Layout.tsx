import { BarChart3, Bell, Droplets, Factory, FileText, Leaf, Map, Menu, ShieldCheck, Sprout, SunMedium, UserCircle2, Wrench } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/farms', label: 'My Farms', icon: Factory },
  { to: '/field-mapping', label: 'Field Mapping & Zones', icon: Map },
  { to: '/soil-health', label: 'Soil Health', icon: Droplets },
  { to: '/fertilizer-planner', label: 'Fertilizer Planner', icon: Wrench },
  { to: '/sowing-calendar', label: 'Sowing Calendar', icon: SunMedium },
  { to: '/cotton-varieties', label: 'Cotton Varieties', icon: Leaf },
  { to: '/pest-disease-guide', label: 'Pest and Disease Guide', icon: ShieldCheck },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/profile', label: 'Profile and Settings', icon: UserCircle2 },
];

export const Layout = () => {
  const { logout, user } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      <aside className="hidden w-72 border-r border-slate-200 bg-white p-5 lg:flex lg:flex-col">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-field-600 text-white shadow-soft">
            <Leaf className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-field-700">AgriCotton AI</p>
            <h1 className="text-xl font-bold">Farm OS</h1>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-field-100 text-field-800' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl bg-field-50 p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-field-700">Field note</p>
          <p className="mt-2 text-sm text-slate-700">Use zone coverage checks and soil data to plan the next nutrient split.</p>
        </div>
      </aside>

      <div className="flex-1">
        <header className="border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 lg:hidden" type="button">
                <Menu className="h-4 w-4" />
              </button>
              <div>
                <p className="text-sm text-slate-500">Good morning</p>
                <h2 className="text-lg font-semibold text-slate-800">{user?.name ?? 'Farmer'}</h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600" type="button">
                <Bell className="h-4 w-4" />
              </button>
              <button
                className="rounded-xl bg-field-600 px-4 py-2 text-sm font-semibold text-white hover:bg-field-700"
                type="button"
                onClick={() => void logout()}
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
