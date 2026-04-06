import {
  LayoutDashboard,
  Link2,
  Shield,
  Activity,
  Bot,
} from 'lucide-react';

export const GOLD = '#B08D3E';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { id: 'connections', label: 'Connections', icon: Link2, path: '/connections' },
  { id: 'delegations', label: 'Delegations', icon: Shield, path: '/delegations' },
  { id: 'agents', label: 'Agents', icon: Bot, path: '/agents' },
  { id: 'activity', label: 'Activity', icon: Activity, path: '/activity' },
] as const;

export const DECISION_COLORS: Record<string, string> = {
  ALLOWED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  BLOCKED: 'bg-red-500/10 text-red-600 border-red-500/20',
  ERROR: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

export const EXPIRY_OPTIONS = [
  { label: '30 minutes', value: '30m' },
  { label: '1 hour', value: '1h' },
  { label: '2 hours', value: '2h' },
  { label: '4 hours', value: '4h' },
  { label: '24 hours', value: '24h' },
];
