import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Compass, Headphones, UserRound } from 'lucide-react';
import { Mascot } from './Mascot';
import { useVoiceCatalog } from '../lib/useVoiceCatalog';

const navItems = [
  { to: '/', label: '学习', icon: BookOpen },
  { to: '/quiz', label: '测验', icon: Headphones },
  { to: '/discover', label: '发现', icon: Compass },
  { to: '/profile', label: '我的', icon: UserRound }
];

export function Layout() {
  useVoiceCatalog();
  const location = useLocation();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <span className="petal left-[8%]" style={{ animationDuration: '15s', animationDelay: '-3s' }} />
        <span className="petal left-[24%]" style={{ animationDuration: '19s', animationDelay: '-8s', opacity: 0.7 }} />
        <span className="petal left-[48%]" style={{ animationDuration: '17s', animationDelay: '-12s' }} />
        <span className="petal left-[71%]" style={{ animationDuration: '21s', animationDelay: '-5s', opacity: 0.65 }} />
        <span className="petal left-[90%]" style={{ animationDuration: '16s', animationDelay: '-10s' }} />
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-lemon/20 blur-3xl" />
        <div className="absolute -right-20 top-52 h-80 w-80 rounded-full bg-sky/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sakura/20 blur-3xl" />
      </div>

      <header className="relative z-30 mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-4 py-4 md:px-8 md:py-6">
        <NavLink to="/" className="flex items-center gap-2.5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/75 shadow-soft ring-1 ring-white/80">
            <Mascot size={34} />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-black tracking-tight text-[#3f3a4f] md:text-xl">
              小满记词
            </span>
            <span className="hidden text-[11px] font-bold tracking-[0.16em] text-[#9b90a7] sm:block">
              WORDS · PLAY · GROW
            </span>
          </span>
        </NavLink>

        <nav className="hidden items-center gap-1 rounded-full border border-white/70 bg-white/55 p-1.5 shadow-soft backdrop-blur-xl md:flex">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold transition ${
                  isActive
                    ? 'bg-gradient-to-r from-sakura to-[#ff7ea8] text-white shadow-[0_10px_24px_-14px_rgba(242,111,153,0.9)]'
                    : 'text-[#6b6478] hover:bg-white/80 hover:text-[#3f3a4f]'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <NavLink
          to="/profile"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/70 text-[#6b6478] shadow-soft ring-1 ring-white/80 md:hidden"
          aria-label="我的"
        >
          <Mascot size={26} />
        </NavLink>
      </header>

      <main className="relative z-10">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between rounded-[1.7rem] border border-white/80 bg-white/80 p-1.5 shadow-soft backdrop-blur-2xl">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex flex-1 flex-col items-center gap-0.5 rounded-[1.3rem] px-2 py-2 text-[10px] font-extrabold transition ${
                  isActive ? 'text-[#f26f99]' : 'text-[#8a8197]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="bottom-nav-pill"
                      className="absolute inset-0 -z-10 rounded-[1.3rem] bg-gradient-to-b from-[#fff0f6] to-white ring-1 ring-[#ffd3e2]"
                      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                    />
                  )}
                  <Icon size={18} strokeWidth={isActive ? 2.6 : 2} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
