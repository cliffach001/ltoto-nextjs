'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import { useAuth } from '@/context/AuthContext';
import Modal from '@/components/Modal';
import { fetchSupabaseData, updateSupabaseRecord, deleteSupabaseRecord, createDeletionRequest, formatToDatetimeLocal, formatFromISOString } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { SwitchGearItem, Status } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';

export default function SwitchGearPage() {
  const { isLoading: authLoading, canEdit, user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<SwitchGearItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<SwitchGearItem | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  // Edit form state
  const [editLocation, setEditLocation] = useState('');
  const [editPic, setEditPic] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editStatus, setEditStatus] = useState<Status>('normal');

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchSupabaseData();
    setData(result);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 15000);
    const channel = supabase
      .channel('db-changes-' + Math.random().toString(36).slice(2))
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

  const sgTotal = data.length;
  const activeCount = data.filter((d) => d.status === 'lototo').length;
  const maintenanceCount = data.filter((d) => d.status === 'maintenance').length;
  const completeCount = data.filter((d) => d.status === 'normal').length;

  const openEditModal = (item: SwitchGearItem) => {
    setEditingItem(item);
    setEditLocation(item.location);
    setEditPic(item.pic);
    setEditTime(item.time ? formatToDatetimeLocal(item.time) : '');
    setEditStatus(item.status);
    setFeedback(null);
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingItem(null);
    setFeedback(null);
  };

  const handleDelete = async (item: SwitchGearItem) => {
    const recordId = item.supabase_id || item.id;

    // Admin: direct delete
    if (user?.role === 'admin') {
      if (!window.confirm(`Apakah Anda yakin ingin menghapus "${item.name}"? Tindakan ini tidak dapat dibatalkan.`)) {
        return;
      }
      const result = await deleteSupabaseRecord(recordId);
      if (result) {
        await refreshData();
      } else {
        setFeedback({ message: 'Gagal menghapus data. Silakan coba lagi.', isError: true });
      }
      return;
    }

    // Operator: request deletion approval
    const confirmMsg = `Kirim permintaan penghapusan "${item.name}" ke admin?`;
    if (!window.confirm(confirmMsg)) return;
    const result = await createDeletionRequest(recordId, item.name, user?.fullName || 'Operator');
    if (result) {
      setFeedback({ message: `Permintaan penghapusan "${item.name}" telah dikirim ke admin untuk disetujui.`, isError: false });
    } else {
      setFeedback({ message: 'Gagal mengirim permintaan. Silakan coba lagi.', isError: true });
    }
  };

  const handleSave = async () => {
    if (!editingItem || !editingItem.supabase_id) {
      setFeedback({ message: 'ID item tidak valid', isError: true });
      return;
    }

    let saveTime = editingItem.time;
    if (editTime) {
      try {
        saveTime = new Date(editTime + ':00').toISOString();
      } catch {
        saveTime = editingItem.time;
      }
    }

    const record: Record<string, unknown> = {
      location: editLocation,
      pic: editPic,
      time: saveTime,
      status: editStatus,
    };

    const result = await updateSupabaseRecord(editingItem.supabase_id, record);
    if (result) {
      setFeedback({ message: 'Data berhasil diperbarui', isError: false });
      await refreshData();
      setTimeout(() => closeEditModal(), 1000);
    } else {
      setFeedback({ message: 'Gagal memperbarui data', isError: true });
    }
  };

  return (
    <>
      <Topbar
        title="Inventaris Switch Gear"
        subtitle="Daftar lengkap switch gear dan status pengamanan LOTOTO di lokasi."
      />

      <section className="cards">
        <div className="card">
          <h2>{sgTotal}</h2>
          <span>Total Switch Gear</span>
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

      <section className="table-section">
        <div className="table-header">
          <div>
            <h2>Daftar Switch Gear</h2>
            <p>Data status LOTOTO, maintenance, dan selesainya pekerjaan.</p>
          </div>
          <button className="button secondary" onClick={refreshData}>
            <i className="fa-solid fa-sync"></i> Perbarui data
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Switch Gear</th>
              <th>Unit</th>
              <th>Lokasi</th>
              <th>PIC</th>
              <th>Waktu</th>
              <th>Status</th>
              {canEdit && <th>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 7 : 6} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                  {isLoading ? 'Memuat data...' : 'Tidak ada data'}
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
                    <td data-label="Waktu">{item.time}</td>
                    <td data-label="Status">
                      <span className={`badge ${status.className}`}>{status.label}</span>
                    </td>
                    {canEdit && (
                      <td data-label="Aksi">
                        <button
                          className="button secondary"
                          onClick={() => openEditModal(item)}
                          style={{ marginRight: '8px' }}
                        >
                          <i className="fa-solid fa-pen"></i> Edit
                        </button>
                        <button
                          className="button danger"
                          onClick={() => handleDelete(item)}
                        >
                          <i className="fa-solid fa-trash"></i> Hapus
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

      <Modal
        isVisible={editModalVisible}
        onClose={closeEditModal}
        title="Edit Switch Gear"
      >
        <div className="form-row">
          <label>Switch Gear</label>
          <input type="text" value={editingItem?.name || ''} disabled />
        </div>
        <div className="form-row">
          <label>Unit</label>
          <input type="text" value={editingItem?.unit || ''} disabled />
        </div>
        <div className="form-row">
          <label>Lokasi</label>
          <input
            type="text"
            value={editLocation}
            onChange={(e) => setEditLocation(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label>PIC</label>
          <input
            type="text"
            value={editPic}
            onChange={(e) => setEditPic(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label>Waktu Aktif</label>
          <input
            type="datetime-local"
            value={editTime}
            onChange={(e) => setEditTime(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label>Status</label>
          <select
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value as Status)}
          >
            <option value="normal">Selesai</option>
            <option value="lototo">LOTOTO Aktif</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        {feedback && (
          <div className={`feedback-message is-visible ${feedback.isError ? 'error' : ''}`}>
            {feedback.message}
          </div>
        )}
        <div className="modal-actions">
          <button className="button secondary" onClick={closeEditModal}>
            Batal
          </button>
          <button className="button primary" onClick={handleSave}>
            Simpan
          </button>
        </div>
      </Modal>

      <section
        style={{
          background: 'var(--card)',
          padding: '24px',
          borderRadius: '20px',
          marginTop: '22px',
          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px',
            fontSize: '14px',
            color: 'var(--text)',
            alignItems: 'center',
          }}
        >
          <span>
            <span className="badge red" style={{ marginRight: 8 }}>
              LOTOTO Aktif
            </span>
            Menandakan switch gear sedang dalam pengamanan LOTOTO.
          </span>
          <span>
            <span className="badge yellow" style={{ marginRight: 8 }}>
              Maintenance
            </span>
            Menandakan switch gear sedang dalam proses maintenance.
          </span>
          <span>
            <span className="badge green" style={{ marginRight: 8 }}>
              Selesai
            </span>
            Menandakan switch gear dalam keadaan normal / selesai maintenance.
          </span>
        </div>
      </section>
    </>
  );
}
