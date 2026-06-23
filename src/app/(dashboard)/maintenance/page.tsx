'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  fetchSupabaseData,
  updateSupabaseRecord,
  logActivityToSupabase,
  createDeletionRequest,
  deleteSupabaseRecord,
  formatToDatetimeLocal,
} from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { SwitchGearItem, Status } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';

export default function MaintenancePage() {
  const { canEdit, user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<SwitchGearItem[]>([]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SwitchGearItem | null>(null);

  // Edit form state
  const [editLokasi, setEditLokasi] = useState('');
  const [editPIC, setEditPIC] = useState('');
  const [editWaktu, setEditWaktu] = useState('');
  const [editStatus, setEditStatus] = useState<Status>('maintenance');

  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const refreshData = useCallback(async () => {
    const result = await fetchSupabaseData();
    if (result) {
      setData(result);
    }
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

  const totalCount = data.length;
  const maintenanceCount = data.filter((d) => d.status === 'maintenance').length;
  const lototoCount = data.filter((d) => d.status === 'lototo').length;
  const normalCount = data.filter((d) => d.status === 'normal').length;

  const maintenanceData = data.filter((d) => d.status === 'maintenance');

  const handleOpenEditModal = (item: SwitchGearItem) => {
    setEditingItem(item);
    setEditLokasi(item.location);
    setEditPIC(item.pic);
    setEditWaktu(item.time ? formatToDatetimeLocal(item.time) : new Date().toISOString().slice(0, 16));
    setEditStatus(item.status);
    setFeedbackMessage('');
    setIsError(false);
    setIsEditModalOpen(true);
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
        setFeedbackMessage('Gagal menghapus data. Silakan coba lagi.');
        setIsError(true);
      }
      return;
    }

    // Operator: request deletion approval
    const confirmMsg = `Kirim permintaan penghapusan "${item.name}" ke admin?`;
    if (!window.confirm(confirmMsg)) return;
    const result = await createDeletionRequest(recordId, item.name, user?.fullName || 'Operator');
    if (result) {
      setFeedbackMessage(`Permintaan penghapusan "${item.name}" telah dikirim ke admin untuk disetujui.`);
      setIsError(false);
    } else {
      setFeedbackMessage('Gagal mengirim permintaan. Silakan coba lagi.');
      setIsError(true);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingItem) return;

    if (!editLokasi || !editPIC || !editWaktu || !editStatus) {
      setFeedbackMessage('Semua field wajib diisi.');
      setIsError(true);
      return;
    }

    const now = new Date(editWaktu).toISOString();
    const pic = editPIC || user?.fullName || 'Admin';
    const recordId = editingItem.supabase_id || editingItem.id;

    const updatedRecord = await updateSupabaseRecord(recordId, {
      location: editLokasi,
      pic,
      time: now,
      status: editStatus,
    });

    if (updatedRecord) {
      await logActivityToSupabase(
        recordId,
        'update_lototo',
        `Memperbarui data maintenance ${editingItem.name} - status: ${editStatus}`,
        pic,
        editStatus
      );
      setIsEditModalOpen(false);
      setEditingItem(null);
      await refreshData();
    } else {
      setFeedbackMessage('Gagal memperbarui data. Silakan coba lagi.');
      setIsError(true);
    }
  };

  const handleExportPDF = useCallback(() => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN MAINTENANCE LOTOTO K3', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    doc.text(`Dicetak: ${now}`, pageWidth / 2, 28, { align: 'center' });

    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.8);
    doc.line(14, 33, pageWidth - 14, 33);

    doc.setFontSize(9);
    doc.text(
      `Tugas Maintenance: ${maintenanceCount}  |  LOTOTO Aktif: ${lototoCount}  |  Selesai: ${normalCount}  |  Total: ${totalCount}`,
      pageWidth / 2, 40, { align: 'center' }
    );

    const tableData = maintenanceData.map((item) => [
      item.name,
      item.unit || '-',
      item.location || '-',
      item.pic || '-',
      item.time || '-',
      STATUS_LABELS[item.status]?.label || '-',
    ]);

    autoTable(doc, {
      startY: 48,
      head: [['Switch Gear', 'Unit', 'Lokasi', 'PIC', 'Waktu', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 48 },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save('laporan-maintenance-lototo-k3.pdf');
  }, [maintenanceData, maintenanceCount, lototoCount, normalCount, totalCount]);

  return (
    <>
      <Topbar
        title="Maintenance LOTOTO"
        subtitle="Kelola pekerjaan maintenance dan perbaikan untuk switch gear yang sedang dijadwalkan."
      />

      <section className="cards">
        <div className="card warning-card">
          <h2>{maintenanceCount}</h2>
          <span>Tugas Maintenance</span>
        </div>
        <div className="card active-card" onClick={() => router.push('/lototo-aktif')} style={{ cursor: 'pointer' }}>
          <h2>{lototoCount}</h2>
          <span>LOTOTO Aktif</span>
        </div>
        <div className="card success-card" onClick={() => router.push('/switch-gear')} style={{ cursor: 'pointer' }}>
          <h2>{normalCount}</h2>
          <span>Sudah Selesai</span>
        </div>
        <div className="card" onClick={() => router.push('/switch-gear')} style={{ cursor: 'pointer' }}>
          <h2>{totalCount}</h2>
          <span>Total Switch Gear</span>
        </div>
      </section>

      <section className="table-section">
        <div className="table-header">
          <div>
            <h2>Daftar Maintenance</h2>
            <p>Data switch gear yang sedang dalam status maintenance.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="button secondary" onClick={refreshData}>
              <i className="fa-solid fa-sync"></i> Perbarui data
            </button>
            <button className="button primary" onClick={handleExportPDF}>
              <i className="fa-solid fa-download"></i> Unduh PDF
            </button>
          </div>
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
            {maintenanceData.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 7 : 6} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                  Tidak ada data maintenance saat ini.
                </td>
              </tr>
            ) : (
              maintenanceData.map((item) => {
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
                          onClick={() => handleOpenEditModal(item)}
                          style={{ marginRight: '8px' }}
                        >
                          <i className="fa-solid fa-pen-to-square"></i> Edit
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

      {/* Edit Modal */}
      <Modal
        isVisible={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
        }}
        title="Edit Data Maintenance"
      >
        <div className="form-row">
          <label htmlFor="editName">Switch Gear</label>
          <input
            id="editName"
            type="text"
            value={editingItem?.name || ''}
            disabled
          />
        </div>
        <div className="form-row">
          <label htmlFor="editUnit">Unit</label>
          <input
            id="editUnit"
            type="text"
            value={editingItem?.unit || ''}
            disabled
          />
        </div>
        <div className="form-row">
          <label htmlFor="editLokasi">Lokasi</label>
          <input
            id="editLokasi"
            type="text"
            value={editLokasi}
            onChange={(e) => setEditLokasi(e.target.value)}
            placeholder="Masukkan lokasi"
          />
        </div>
        <div className="form-row">
          <label htmlFor="editPIC">PIC</label>
          <input
            id="editPIC"
            type="text"
            value={editPIC}
            onChange={(e) => setEditPIC(e.target.value)}
            placeholder="Masukkan PIC"
          />
        </div>
        <div className="form-row">
          <label htmlFor="editWaktu">Waktu</label>
          <input
            id="editWaktu"
            type="datetime-local"
            value={editWaktu}
            onChange={(e) => setEditWaktu(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label htmlFor="editStatus">Status</label>
          <select
            id="editStatus"
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value as Status)}
          >
            <option value="lototo">LOTOTO Aktif</option>
            <option value="maintenance">Maintenance</option>
            <option value="normal">Selesai</option>
          </select>
        </div>
        {feedbackMessage && (
          <div className={`feedback-message is-visible ${isError ? 'error' : ''}`}>
            {feedbackMessage}
          </div>
        )}
        <div className="modal-actions">
          <button
            className="button secondary"
            onClick={() => {
              setIsEditModalOpen(false);
              setEditingItem(null);
            }}
          >
            Batal
          </button>
          <button className="button primary" onClick={handleEditSubmit}>
            <i className="fa-solid fa-save"></i> Simpan Perubahan
          </button>
        </div>
      </Modal>

      <section className="table-section" style={{ marginTop: '1.5rem' }}>
        <div className="table-header">
          <div>
            <h2>Catatan Keselamatan Maintenance</h2>
            <p>Panduan langkah keselamatan sebelum memulai pekerjaan maintenance.</p>
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', lineHeight: '1.8', color: 'var(--text)' }}>
          <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
            <li>
              <strong>LOTO</strong> &mdash; Pastikan semua sumber energi telah di-isolasi dan
              kunci LOTO terpasang sebelum memulai pekerjaan.
            </li>
            <li>
              <strong>Verifikasi</strong> &mdash; Lakukan verifikasi isolasi energi dengan
              mengukur tegangan menggunakan alat ukur yang terkalibrasi.
            </li>
            <li>
              <strong>APD</strong> &mdash; Gunakan Alat Pelindung Diri (APD) yang sesuai:
              helm safety, sarung tangan isolasi, kacamata pengaman, dan sepatu safety.
            </li>
            <li>
              <strong>Izin Kerja</strong> &mdash; Pastikan izin kerja (Work Permit) telah
              disetujui dan dipahami oleh seluruh anggota tim.
            </li>
            <li>
              <strong>Komunikasi</strong> &mdash; Koordinasikan jadwal maintenance dengan
              operator dan tim terkait agar tidak terjadi kesalahan operasional.
            </li>
            <li>
              <strong>Dokumentasi</strong> &mdash; Catat setiap temuan, tindakan, dan hasil
              pengujian selama maintenance untuk keperluan audit dan evaluasi.
            </li>
          </ol>
        </div>
      </section>
    </>
  );
}
