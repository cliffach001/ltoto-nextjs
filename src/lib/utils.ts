import { supabase } from './supabase';
import type { Status, SwitchGearItem, ActivityLog, Profile, DeletionRequest } from './types';

export function formatFromISOString(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDiagramId(name: string): string {
  if (!name) return '';
  const digits = name.match(/(\d+)/);
  if (digits) {
    return `sg${Number(digits[1])}`;
  }
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function formatToDatetimeLocal(dateString: string): string {
  // Convert DD/MM/YYYY HH:MM to YYYY-MM-DDTHH:mm
  const parts = dateString.split(' ');
  const dateParts = parts[0]!.split('/');
  const timeParts = parts[1]!.split(':');
  return `${dateParts[2]}-${dateParts[1]!}-${dateParts[0]!}T${timeParts[0]!}:${timeParts[1]!}`;
}

export function formatFromDatetimeLocal(datetimeLocal: string): string {
  // Convert YYYY-MM-DDTHH:mm to DD/MM/YYYY HH:MM
  const [date, time] = datetimeLocal.split('T');
  const [year, month, day] = date!.split('-');
  return `${day}/${month}/${year} ${time}`;
}

export function normalizeStatus(value: string | null | undefined): Status {
  if (!value) return 'normal';
  const normalized = value.toString().trim().toLowerCase();
  if (['lototo', 'lototo aktif', 'active', 'aktif'].includes(normalized)) return 'lototo';
  if (['maintenance', 'maint', 'repair', 'perbaikan', 'berjalan'].includes(normalized))
    return 'maintenance';
  return 'normal';
}

export async function hashPassword(password: string): Promise<string> {
  if (!password) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Supabase CRUD operations

export async function insertSupabaseRecord(record: Record<string, unknown>) {
  const { data, error } = await supabase.from('lototo_aktif').insert([record]).select();
  if (error) {
    console.error('Supabase insert error:', error.message, error.details, error.hint, error.code);
    return null;
  }
  return data?.[0] ?? null;
}

export async function updateSupabaseRecord(id: string, record: Record<string, unknown>) {
  const { data, error } = await supabase.from('lototo_aktif').update(record).eq('id', id).select();
  if (error) {
    console.error('Supabase update error:', error.message);
    return null;
  }
  return data?.[0] ?? null;
}

export async function logActivityToSupabase(
  lototoId: string,
  action: string,
  description: string,
  pic: string,
  status: string
) {
  const activityLog = {
    lototo_id: lototoId,
    switch_gear_id: lototoId,
    action,
    description: description || '',
    pic: pic || 'System',
    status: status || 'normal',
  };
  const { data, error } = await supabase.from('activity_logs').insert([activityLog]).select();
  if (error) {
    console.error('Gagal mencatat aktivitas:', error.message);
    return null;
  }
  return data?.[0] ?? null;
}

export async function fetchSupabaseData(): Promise<SwitchGearItem[]> {
  const { data, error } = await supabase.from('lototo_aktif').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Supabase fetch error:', error);
    return [];
  }
  return (data ?? []).map((item: Record<string, unknown>, idx: number) => ({
    idIndex: idx,
    supabase_id: (item.id as string) ?? null,
    id: formatDiagramId((item.name as string) || ''),
    name: (item.name as string) || '',
    unit: (item.unit as string) || '',
    location: (item.location as string) || '',
    status: normalizeStatus((item.status as string) || null),
    pic: (item.pic as string) || '',
    time: item.time ? formatFromISOString(item.time as string) : '',
    no_notif: (item.no_notif as string) || '',
    no_lototo: (item.no_lototo as string) || '',
    peminta: (item.peminta as string) || '',
    keterangan: (item.keterangan as string) || '',
    gambar: (item.gambar as string) || '',
  }));
}

export async function fetchActivityLogs(): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, lototo_id, action, description, pic, status, logged_at')
    .order('logged_at', { ascending: false })
    .limit(100);

  if (error || !data) {
    console.error('Fetch activity logs gagal:', error?.message);
    return [];
  }

  // Get switch gear names for mapping
  const { data: switchGears } = await supabase.from('lototo_aktif').select('id, name');
  const sgMap: Record<string, string> = {};
  if (switchGears) {
    switchGears.forEach((sg: { id: string; name: string }) => {
      sgMap[sg.id] = sg.name;
    });
  }

  return (data ?? []).map((log: Record<string, unknown>) => ({
    id: log.id as string,
    logged_at: formatFromISOString(log.logged_at as string),
    switch_gear_name: sgMap[log.lototo_id as string] || ((log.lototo_id as string) ?? '-'),
    action: (log.action as string) || '',
    description: (log.description as string) || '',
    pic: (log.pic as string) || '',
    status: (log.status as string) || '',
  }));
}

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, email, role, department, status')
    .order('created_at', { ascending: false });
  if (error || !data) {
    console.error('Fetch profiles error:', error);
    return [];
  }
  return (data ?? []).map((item: Record<string, unknown>, idx: number) => ({
    idIndex: idx,
    id: (item.id as string) || '',
    username: (item.username as string) || '',
    full_name: (item.full_name as string) || '',
    email: (item.email as string) || '',
    role: (item.role as string) || 'operator',
    department: (item.department as string) || '',
    status: (item.status as string) || 'active',
  }));
}

export async function insertProfile(record: Record<string, unknown>) {
  const { data, error } = await supabase.from('profiles').insert([record]).select();
  if (error) {
    console.error('Insert profile error:', error.message);
    return null;
  }
  return data?.[0] ?? null;
}

export async function updateProfile(id: string, record: Record<string, unknown>) {
  const { data, error } = await supabase.from('profiles').update(record).eq('id', id).select();
  if (error) {
    console.error('Update profile error:', error.message);
    return null;
  }
  return data?.[0] ?? null;
}

export async function deleteSupabaseRecord(id: string) {
  const { data, error } = await supabase.from('lototo_aktif').delete().eq('id', id).select();
  if (error) {
    console.error('Delete record error:', error.message);
    return null;
  }
  return data?.[0] ?? null;
}

// ── Deletion Approval System ──

export async function createDeletionRequest(
  recordId: string,
  switchGearName: string,
  requestedBy: string
) {
  const { data, error } = await supabase.from('activity_logs').insert([
    {
      lototo_id: recordId,
      switch_gear_id: recordId,
      action: 'delete_request',
      description: `Permintaan hapus: ${switchGearName}`,
      pic: requestedBy,
      status: 'pending',
    },
  ]).select();

  if (error) {
    console.error('Create deletion request error:', error.message);
    return null;
  }
  return data?.[0] ?? null;
}

export async function fetchPendingDeletionRequests(): Promise<DeletionRequest[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, lototo_id, description, pic, logged_at, status')
    .eq('action', 'delete_request')
    .eq('status', 'pending')
    .order('logged_at', { ascending: false });

  if (error || !data) {
    console.error('Fetch pending deletions error:', error?.message);
    return [];
  }

  return (data ?? []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    record_id: (item.lototo_id as string) ?? '',
    switch_gear_name: ((item.description as string) ?? '').replace('Permintaan hapus: ', ''),
    requested_by: (item.pic as string) ?? '',
    requested_at: formatFromISOString(item.logged_at as string),
    status: 'pending' as const,
  }));
}

export async function updateActivityLogStatus(
  logId: string,
  newStatus: string,
  approvedBy: string
) {
  const { data, error } = await supabase
    .from('activity_logs')
    .update({ status: newStatus, pic: approvedBy })
    .eq('id', logId)
    .select();

  if (error) {
    console.error('Update activity log error:', error.message);
    return null;
  }
  return data?.[0] ?? null;
}

// ── End Deletion Approval System ──

export async function deleteProfile(id: string) {
  const { data, error } = await supabase.from('profiles').delete().eq('id', id).select();
  if (error) {
    console.error('Delete profile error:', error.message);
    return null;
  }
  return data?.[0] ?? null;
}

export async function authenticateUser(username: string, password: string) {
  const hashed = await hashPassword(password);
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, email, role, status')
    .eq('username', username)
    .eq('hashed_password', hashed)
    .maybeSingle();

  if (error) {
    console.error('Auth error:', error);
    return null;
  }
  return data;
}

