// Type definitions for LOTOTO K3

export type Status = 'lototo' | 'maintenance' | 'normal';

export interface SwitchGearItem {
  idIndex: number;
  supabase_id: string | null;
  id: string;
  name: string;
  unit: string;
  location: string;
  status: Status;
  pic: string;
  time: string;
  no_notif: string;
  no_lototo: string;
  peminta: string;
  keterangan: string;
  gambar: string;
}

export interface ActivityLog {
  id: string;
  logged_at: string;
  switch_gear_name: string;
  action: string;
  description: string;
  pic: string;
  status: string;
}

export interface DeletionRequest {
  id: string;
  record_id: string;
  switch_gear_name: string;
  requested_by: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Profile {
  idIndex: number;
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  status: string;
}

export const STATUS_LABELS: Record<Status, { label: string; className: string }> = {
  normal: { label: 'Selesai', className: 'green' },
  maintenance: { label: 'Maintenance', className: 'yellow' },
  lototo: { label: 'LOTOTO Aktif', className: 'red' },
};

export const STATUSES: Status[] = ['normal', 'maintenance', 'lototo'];

export const STATUS_BADGE_CLASS: Record<string, string> = {
  lototo: 'red',
  maintenance: 'yellow',
  normal: 'green',
};

export const PAGE_ROLE_ACCESS: Record<string, string[]> = {
  dashboard: ['admin', 'manager', 'operator', 'viewer'],
  'lototo-aktif': ['admin', 'manager', 'operator', 'viewer'],
  maintenance: ['admin', 'manager', 'operator', 'viewer'],
  'switch-gear': ['admin', 'manager', 'operator', 'viewer'],
  laporan: ['admin', 'manager', 'operator', 'viewer'],
  pengguna: ['admin'],
};

export const MENU_ITEMS = [
  { href: '/', icon: 'fa-chart-line', label: 'Dashboard', page: 'dashboard' },
  { href: '/lototo-aktif', icon: 'fa-lock', label: 'LOTOTO Aktif', page: 'lototo-aktif' },
  { href: '/maintenance', icon: 'fa-screwdriver-wrench', label: 'Maintenance', page: 'maintenance' },
  { href: '/switch-gear', icon: 'fa-bolt', label: 'Switch Gear', page: 'switch-gear' },
  { href: '/laporan', icon: 'fa-file-lines', label: 'Laporan', page: 'laporan' },
  { href: '/pengguna', icon: 'fa-users', label: 'Pengguna', page: 'pengguna' },
];
