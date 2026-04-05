import React, { useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PanelLeftClose, PanelLeftOpen, Shield, Lock, LogIn, LogOut, User } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export const Layout: React.FC = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, githubToken, login, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const expanded = sidebarExpanded || sidebarHovered;

  return (
    <div className="flex h-screen bg-[#FAFAF8] overflow-hidden">
      {/* Sidebar */}
      <motion.nav
        className="relative flex flex-col h-full bg-white border-r border-[#E8E5DE] z-30 overflow-hidden"
        animate={{ width: expanded ? 220 : 48 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const }}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        {/* Logo */}
        <div className="flex items-center h-12 px-3 border-b border-[#E8E5DE]">
          <div
            className="w-6 h-6 rounded bg-[#1A1814] flex items-center justify-center shrink-0 cursor-pointer"
            onClick={() => setSidebarExpanded(e => !e)}
          >
            <Lock className="w-3 h-3 text-[#B08D3E]" />
          </div>
          <motion.div
            className="flex items-center gap-2 ml-3 whitespace-nowrap overflow-hidden"
            animate={{ opacity: expanded ? 1 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <span className="text-sm font-bold text-[#1A1814]">AgentGate</span>
            <button
              onClick={() => setSidebarExpanded(e => !e)}
              className="text-[#9C978E] hover:text-[#6B6560] transition-colors ml-auto"
            >
              {sidebarExpanded ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
            </button>
          </motion.div>
        </div>

        {/* Nav items */}
        <div className="flex-1 py-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                className={cn(
                  'w-full flex items-center h-9 px-3 gap-3 text-sm transition-colors relative',
                  active ? 'text-[#B08D3E]' : 'text-[#6B6560] hover:text-[#1A1814]',
                )}
                onClick={() => navigate(item.path)}
                whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                transition={{ duration: 0.1 }}
              >
                {active && (
                  <motion.div
                    className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#B08D3E] rounded-r"
                    layoutId="sidebar-active"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
                <motion.span
                  className="whitespace-nowrap truncate"
                  animate={{ opacity: expanded ? 1 : 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {item.label}
                </motion.span>
              </motion.button>
            );
          })}
        </div>

        {/* Bottom: auth + two-layer badge */}
        <div className="border-t border-[#E8E5DE] py-2 px-3 space-y-2">
          {/* Auth status */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              {user?.picture ? (
                <img src={user.picture} className="w-5 h-5 rounded-full shrink-0" alt="" />
              ) : (
                <User className="w-4 h-4 text-[#6B6560] shrink-0" />
              )}
              <motion.div
                className="flex-1 min-w-0"
                animate={{ opacity: expanded ? 1 : 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="text-[10px] font-medium text-[#1A1814] truncate">{user?.name || user?.email}</div>
                <div className="flex items-center gap-1">
                  <span className={cn('w-1.5 h-1.5 rounded-full', githubToken ? 'bg-emerald-600' : 'bg-[#9C978E]')} />
                  <span className="text-[8px] text-[#9C978E]">{githubToken ? 'Vault connected' : 'No vault token'}</span>
                </div>
              </motion.div>
              <motion.button
                onClick={logout}
                className="text-[#9C978E] hover:text-red-600 transition-colors shrink-0"
                animate={{ opacity: expanded ? 1 : 0 }}
                transition={{ duration: 0.15 }}
              >
                <LogOut className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          ) : (
            <motion.button
              onClick={login}
              className="w-full flex items-center gap-2 h-8 px-2 rounded-lg bg-[#B08D3E] text-white text-xs font-medium hover:bg-[#C5A572] transition-colors"
              animate={{ opacity: expanded ? 1 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              Login with Auth0
            </motion.button>
          )}

          {/* Two-layer badge */}
          <motion.div
            className="flex items-center gap-2"
            animate={{ opacity: expanded ? 1 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <Shield className="w-3.5 h-3.5 text-[#B08D3E] shrink-0" />
            <div className="text-[9px] text-[#9C978E] leading-tight">
              <div className="font-semibold text-[#6B6560]">Two-Layer Auth</div>
              <div>Auth0 + Kanoniv</div>
            </div>
          </motion.div>
        </div>
      </motion.nav>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
