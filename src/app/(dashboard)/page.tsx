'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import SupabaseBanner from '@/components/SupabaseBanner';
import StatusChart from '@/components/StatusChart';
import { useAuth } from '@/context/AuthContext';
import { fetchSupabaseData } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { SwitchGearItem } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';

export default function DashboardPage() {
  const { isLoading, canEdit } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<SwitchGearItem[]>([]);
  const [connectionMsg, setConnectionMsg] = useState('Menghubungkan ke Supabase...');
  const [isConnected, setIsConnected] = useState(false);

  const refreshData = useCallback(async () => {
    setConnectionMsg('Menghubungkan ke Supabase...');
    setIsConnected(false);
    const result = await fetchSupabaseData();
    if (result) {
      setData(result);
      setConnectionMsg(`Supabase terhubung (${result.length} row)`);
      setIsConnected(true);
    } else {
      setConnectionMsg('Gagal mengambil data dari Supabase');
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 15000);
    const channel = supabase
      .channel('db-changes-dash')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'lototo_aktif' },
        () => { refreshData(); }
      )
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [refreshData]);

  const activeCount = data.filter((d) => d.status === 'lototo').length;
  const maintenanceCount = data.filter((d) => d.status === 'maintenance').length;
  const completeCount = data.filter((d) => d.status === 'normal').length;

  return (
    <>
      <Topbar title="Dashboard LOTOTO K3" subtitle="Monitoring pengamanan switch gear dan status LOTOTO pra maintenance." />
      <SupabaseBanner message={connectionMsg} isConnected={isConnected} />

      <section className="cards">
        <div className="card" onClick={() => router.push('/switch-gear')} style={{ cursor: 'pointer' }}>
          <h2>{data.length}</h2>
          <span>Total Pekerjaan</span>
        </div>
        <div className="card active-card" onClick={() => router.push('/lototo-aktif')} style={{ cursor: 'pointer' }}>
          <h2>{activeCount}</h2>
          <span>LOTOTO Aktif</span>
        </div>
        <div className="card warning-card" onClick={() => router.push('/maintenance')} style={{ cursor: 'pointer' }}>
          <h2>{maintenanceCount}</h2>
          <span>Maintenance</span>
        </div>
        <div className="card success-card">
          <h2>{completeCount}</h2>
          <span>Selesai</span>
        </div>
      </section>

      <StatusChart
        total={data.length}
        active={activeCount}
        maintenance={maintenanceCount}
        complete={completeCount}
      />


      {/* Status Table */}
      <section className="table-section">
        <div className="table-header">
          <div>
            <h2>Status Switch Gear</h2>
            <p>Data status LOTOTO, maintenance, dan selesainya pekerjaan.</p>
          </div>
          <button className="button secondary" onClick={refreshData}>
            <i className="fa-solid fa-sync"></i> Perbarui status
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Switch Gear</th>
              <th>Unit</th>
              <th>Lokasi</th>
              <th>PIC</th>
              <th>Tanggal</th>
              <th>Status</th>
              {canEdit && <th>Aksi</th>}
            </tr>
          </thead>
          <tbody id="statusTableBody">
            {data.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 7 : 6} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                  {connectionMsg.includes('terhubung') ? 'Tidak ada data' : 'Memuat data...'}
                </td>
              </tr>
            ) : (
              data.map((item) => {
                const status = STATUS_LABELS[item.status];
                return (
                  <tr key={item.idIndex}>
                    <td data-label="Switch Gear">{item.name}</td>
                    <td data-label="Unit">{item.unit}</td>
                    <td data-label="Lokasi">{item.location}</td>
                    <td data-label="PIC">{item.pic}</td>
                    <td data-label="Tanggal">{item.time}</td>
                    <td data-label="Status">
                      <span className={`badge ${status.className}`}>{status.label}</span>
                    </td>
                    {canEdit && (
                      <td data-label="Aksi">
                        <button
                          className="button secondary"
                          onClick={() => router.push('/lototo-aktif')}
                        >
                          <i className="fa-solid fa-eye"></i> Detail
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
