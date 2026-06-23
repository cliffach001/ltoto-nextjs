'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import { useAuth } from '@/context/AuthContext';
import Modal from '@/components/Modal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  fetchSupabaseData,
  insertSupabaseRecord,
  updateSupabaseRecord,
  logActivityToSupabase,
  createDeletionRequest,
  deleteSupabaseRecord,
  formatToDatetimeLocal,
} from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { SwitchGearItem, Status } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';

export default function LototoAktifPage() {
  const { canEdit, canCreate, user } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<SwitchGearItem[]>([]);
  const [lastUpdate, setLastUpdate] = useState('');

  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SwitchGearItem | null>(null);

  // Input form state
  const [inputName, setInputName] = useState('');
  const [inputUnit, setInputUnit] = useState('');
  const [inputLokasi, setInputLokasi] = useState('');
  const [inputPIC, setInputPIC] = useState('');
  const [inputWaktu, setInputWaktu] = useState('');
  const [inputNotif, setInputNotif] = useState('');
  const [inputLototo, setInputLototo] = useState('');
  const [inputPeminta, setInputPeminta] = useState('');
  const [inputKeterangan, setInputKeterangan] = useState('');
  const [inputGambar, setInputGambar] = useState('');

  // Edit form state
  const [editLokasi, setEditLokasi] = useState('');
  const [editPIC, setEditPIC] = useState('');
  const [editWaktu, setEditWaktu] = useState('');
  const [editStatus, setEditStatus] = useState<Status>('lototo');
  const [editNotif, setEditNotif] = useState('');
  const [editLototo, setEditLototo] = useState('');
  const [editPeminta, setEditPeminta] = useState('');
  const [editKeterangan, setEditKeterangan] = useState('');
  const [editGambar, setEditGambar] = useState('');

  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const refreshData = useCallback(async () => {
    const result = await fetchSupabaseData();
    if (result) {
      setData(result);
      setLastUpdate(new Date().toLocaleString('id-ID'));
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

  const resetInputForm = () => {
    setInputName('');
    setInputUnit('');
    setInputLokasi('');
    setInputPIC('');
    setInputWaktu(new Date().toISOString().slice(0, 16));
    setInputNotif('');
    setInputLototo('');
    setInputPeminta('');
    setInputKeterangan('');
    setInputGambar('');
    setFeedbackMessage('');
    setIsError(false);
  };

  const handleOpenInputModal = () => {
    resetInputForm();
    setIsInputModalOpen(true);
  };

  const handleOpenEditModal = (item: SwitchGearItem) => {
    setEditingItem(item);
    setEditLokasi(item.location);
    setEditPIC(item.pic);
    setEditWaktu(item.time ? formatToDatetimeLocal(item.time) : new Date().toISOString().slice(0, 16));
    setEditStatus(item.status);
    setEditNotif(item.no_notif);
    setEditLototo(item.no_lototo);
    setEditPeminta(item.peminta);
    setEditKeterangan(item.keterangan);
    setEditGambar(item.gambar);
    setFeedbackMessage('');
    setIsError(false);
    setIsEditModalOpen(true);
  };

  const handleInputSubmit = async () => {
    if (!inputName || !inputUnit || !inputLokasi || !inputPIC || !inputWaktu) {
      setFeedbackMessage('Semua field wajib diisi.');
      setIsError(true);
      return;
    }

    const now = new Date(inputWaktu).toISOString();
    const pic = inputPIC || user?.fullName || 'Admin';

    const newRecord = await insertSupabaseRecord({
      name: inputName,
      unit: inputUnit,
      location: inputLokasi,
      pic,
      time: now,
      status: 'lototo',
      no_notif: inputNotif,
      no_lototo: inputLototo,
      peminta: inputPeminta,
      keterangan: inputKeterangan,
      gambar: inputGambar,
    });

    if (newRecord) {
      await logActivityToSupabase(
        newRecord.id as string,
        'create_lototo',
        `Membuat LOTOTO baru untuk ${inputName} - ${inputUnit}`,
        pic,
        'lototo'
      );
      setIsInputModalOpen(false);
      resetInputForm();
      await refreshData();
    } else {
      setFeedbackMessage('Gagal menambahkan data. Silakan coba lagi.');
      setIsError(true);
    }
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
      no_notif: editNotif,
      no_lototo: editLototo,
      peminta: editPeminta,
      keterangan: editKeterangan,
      gambar: editGambar,
    });

    if (updatedRecord) {
      await logActivityToSupabase(
        recordId,
        'update_lototo',
        `Memperbarui data LOTOTO ${editingItem.name} - status: ${editStatus}`,
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

  const lototoData = data.filter((d) => d.status === 'lototo');
  const maintenanceCount = data.filter((d) => d.status === 'maintenance').length;
  const remainingCount = data.filter((d) => d.status === 'normal').length;

  const sendWhatsApp = (item: SwitchGearItem) => {
    const message = [
      '📋 *LAPORAN LOTOTO AKTIF*',
      '═══════════════════════',
      `*Switch Gear:* ${item.name}`,
      `*Unit:* ${item.unit}`,
      `*Lokasi:* ${item.location}`,
      `*PIC:* ${item.pic}`,
      `*Waktu Aktif:* ${item.time}`,
      `*No. Notif:* ${item.no_notif || '-'}`,
      `*No. Lototo:* ${item.no_lototo || '-'}`,
      `*Peminta:* ${item.peminta || '-'}`,
      `*Status:* ${STATUS_LABELS[item.status].label}`,
      `*Keterangan:* ${item.keterangan || '-'}`,
      '═══════════════════════',
      `Dikirim: ${new Date().toLocaleString('id-ID')}`,
    ].join('\n');

    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleExportPDF = useCallback(() => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN LOTOTO AKTIF', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    doc.text(`Dicetak: ${now}`, pageWidth / 2, 28, { align: 'center' });

    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.8);
    doc.line(14, 33, pageWidth - 14, 33);

    doc.setFontSize(9);
    doc.text(
      `LOTOTO Aktif: ${lototoData.length}  |  Maintenance: ${maintenanceCount}  |  Tersisa: ${remainingCount}  |  Total: ${data.length}`,
      pageWidth / 2, 40, { align: 'center' }
    );

    const tableData = lototoData.map((item) => [
      item.name,
      item.unit || '-',
      item.location || '-',
      item.pic || '-',
      item.time || '-',
      STATUS_LABELS[item.status]?.label || '-',
    ]);

    autoTable(doc, {
      startY: 48,
      head: [['Switch Gear', 'Unit', 'Lokasi', 'PIC', 'Waktu Aktif', 'Status']],
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

    doc.save('laporan-lototo-aktif.pdf');
  }, [lototoData, maintenanceCount, remainingCount, data.length]);

  return (
    <>
      <Topbar
        title="LOTOTO Aktif"
        subtitle="Daftar switch gear yang saat ini dalam status pengamanan LOTOTO."
      />

      <section className="cards">
        <div className="card active-card">
          <h2>{lototoData.length}</h2>
          <span>LOTOTO Aktif</span>
        </div>
        <div className="card warning-card" onClick={() => router.push('/maintenance')} style={{ cursor: 'pointer' }}>
          <h2>{maintenanceCount}</h2>
          <span>Pemeliharaan Terjadwal</span>
        </div>
        <div className="card success-card" onClick={() => router.push('/switch-gear')} style={{ cursor: 'pointer' }}>
          <h2>{remainingCount}</h2>
          <span>Switch Gear Tersisa</span>
        </div>
        <div className="card">
          <h2>{lastUpdate || '-'}</h2>
          <span>Update Terakhir</span>
        </div>
      </section>

      <section className="table-section">
        <div className="table-header">
          <div>
            <h2>Rincian LOTOTO Aktif</h2>
            <p>Data switch gear yang sedang dalam status pengamanan LOTOTO.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {canCreate && (
              <button className="button primary" onClick={handleOpenInputModal}>
                <i className="fa-solid fa-plus"></i> Tambah Data
              </button>
            )}
            <button className="button secondary" onClick={handleExportPDF}>
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
              <th>Waktu Aktif</th>
              <th>Status</th>
              <th>WhatsApp</th>
              {canEdit && <th>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {lototoData.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 8 : 7} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                  'Memuat data...'
                </td>
              </tr>
            ) : (
              lototoData.map((item) => {
                const status = STATUS_LABELS[item.status];
                return (
                  <tr key={item.idIndex}>
                    <td data-label="Switch Gear">{item.name}</td>
                    <td data-label="Unit">{item.unit}</td>
                    <td data-label="Lokasi">{item.location}</td>
                    <td data-label="PIC">{item.pic}</td>
                    <td data-label="Waktu Aktif">{item.time}</td>
                    <td data-label="Status">
                      <span className={`badge ${status.className}`}>{status.label}</span>
                    </td>
                    <td data-label="WhatsApp">
                      <button
                        className="button secondary"
                        onClick={() => sendWhatsApp(item)}
                        style={{ background: '#25D366', color: '#fff', border: 'none' }}
                      >
                        <i className="fa-brands fa-whatsapp"></i> Kirim
                      </button>
                    </td>
                    {canEdit && (
                      <td data-label="Aksi">
                        <button
                          className="button secondary"
                          onClick={() => handleOpenEditModal(item)}
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

      {/* Input Modal */}
      <Modal
        isVisible={isInputModalOpen}
        onClose={() => setIsInputModalOpen(false)}
        title="Tambah Data LOTOTO"
      >
        <div className="form-row">
          <label htmlFor="inputName">Switch Gear</label>
          <input
            id="inputName"
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            placeholder="Contoh: SG-01 / SG-02 / SG-03 / SG-04 / SG-05 / SG-06 / SG-07"
          />
        </div>
        <div className="form-row">
          <label htmlFor="inputUnit">Unit</label>
          <input
            id="inputUnit"
            type="text"
            value={inputUnit}
            onChange={(e) => setInputUnit(e.target.value)}
            placeholder="Masukkan unit"
          />
        </div>
        <div className="form-row">
          <label htmlFor="inputLokasi">Lokasi</label>
          <input
            id="inputLokasi"
            type="text"
            value={inputLokasi}
            onChange={(e) => setInputLokasi(e.target.value)}
            placeholder="Masukkan lokasi"
          />
        </div>
        <div className="form-row">
          <label htmlFor="inputPIC">PIC</label>
          <input
            id="inputPIC"
            type="text"
            value={inputPIC}
            onChange={(e) => setInputPIC(e.target.value)}
            placeholder="Masukkan PIC"
          />
        </div>
        <div className="form-row">
          <label htmlFor="inputWaktu">Waktu Aktif</label>
          <input
            id="inputWaktu"
            type="datetime-local"
            value={inputWaktu}
            onChange={(e) => setInputWaktu(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label htmlFor="inputNotif">No. Notif</label>
          <input
            id="inputNotif"
            type="text"
            value={inputNotif}
            onChange={(e) => setInputNotif(e.target.value)}
            placeholder="Masukkan nomor notif"
          />
        </div>
        <div className="form-row">
          <label htmlFor="inputLototo">No. Lototo</label>
          <input
            id="inputLototo"
            type="text"
            value={inputLototo}
            onChange={(e) => setInputLototo(e.target.value)}
            placeholder="Masukkan nomor LOTOTO"
          />
        </div>
        <div className="form-row">
          <label htmlFor="inputPeminta">Peminta</label>
          <input
            id="inputPeminta"
            type="text"
            value={inputPeminta}
            onChange={(e) => setInputPeminta(e.target.value)}
            placeholder="Masukkan nama peminta"
          />
        </div>
        <div className="form-row">
          <label htmlFor="inputKeterangan">Keterangan</label>
          <textarea
            id="inputKeterangan"
            value={inputKeterangan}
            onChange={(e) => setInputKeterangan(e.target.value)}
            placeholder="Masukkan keterangan"
            rows={3}
          />
        </div>
        <div className="form-row">
          <label htmlFor="inputGambar">Gambar</label>
          <input
            id="inputGambar"
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const base64 = await fileToBase64(file);
                setInputGambar(base64);
              }
            }}
          />
          {inputGambar && (
            <div style={{ marginTop: 8 }}>
              <img
                src={inputGambar}
                alt="Preview"
                style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, objectFit: 'cover' }}
              />
            </div>
          )}
        </div>
        {feedbackMessage && (
          <div className={`feedback-message is-visible ${isError ? 'error' : ''}`}>
            {feedbackMessage}
          </div>
        )}
        <div className="modal-actions">
          <button className="button secondary" onClick={() => setIsInputModalOpen(false)}>
            Batal
          </button>
          <button className="button primary" onClick={handleInputSubmit}>
            <i className="fa-solid fa-save"></i> Simpan
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isVisible={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
        }}
        title="Edit Data LOTOTO"
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
          <label htmlFor="editWaktu">Waktu Aktif</label>
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
        <div className="form-row">
          <label htmlFor="editNotif">No. Notif</label>
          <input
            id="editNotif"
            type="text"
            value={editNotif}
            onChange={(e) => setEditNotif(e.target.value)}
            placeholder="Masukkan nomor notif"
          />
        </div>
        <div className="form-row">
          <label htmlFor="editLototo">No. Lototo</label>
          <input
            id="editLototo"
            type="text"
            value={editLototo}
            onChange={(e) => setEditLototo(e.target.value)}
            placeholder="Masukkan nomor LOTOTO"
          />
        </div>
        <div className="form-row">
          <label htmlFor="editPeminta">Peminta</label>
          <input
            id="editPeminta"
            type="text"
            value={editPeminta}
            onChange={(e) => setEditPeminta(e.target.value)}
            placeholder="Masukkan nama peminta"
          />
        </div>
        <div className="form-row">
          <label htmlFor="editKeterangan">Keterangan</label>
          <textarea
            id="editKeterangan"
            value={editKeterangan}
            onChange={(e) => setEditKeterangan(e.target.value)}
            placeholder="Masukkan keterangan"
            rows={3}
          />
        </div>
        <div className="form-row">
          <label htmlFor="editGambar">Gambar</label>
          <input
            id="editGambar"
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const base64 = await fileToBase64(file);
                setEditGambar(base64);
              }
            }}
          />
          {editGambar && (
            <div style={{ marginTop: 8 }}>
              <img
                src={editGambar}
                alt="Preview"
                style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, objectFit: 'cover' }}
              />
            </div>
          )}
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

      {/* LOTOTO Steps Section */}
      <section className="sld-panel">
        <div className="panel-title">
          <i className="fa-solid fa-list-ol"></i> Prosedur LOTOTO
        </div>
        <div className="info-box">
          <div className="info-item">
            <strong>1. Identifikasi</strong>
            <p>Identifikasi semua sumber energi yang perlu diamankan pada switch gear sebelum memulai pekerjaan.</p>
          </div>
          <div className="info-item">
            <strong>2. Penguncian (Lock)</strong>
            <p>Pasang gembok pengaman (LOTO tag) pada switch gear yang akan diamankan untuk mencegah energi tidak sengaja menyala.</p>
          </div>
          <div className="info-item">
            <strong>3. Penandaan (Tag)</strong>
            <p>Pasang tanda peringatan pada switch gear yang terkunci berisi informasi pekerjaan dan PIC yang bertanggung jawab.</p>
          </div>
          <div className="info-item">
            <strong>4. Verifikasi</strong>
            <p>Pastikan semua sumber energi telah diamankan dan switch gear aman untuk dilakukan perbaikan atau perawatan.</p>
          </div>
          <div className="info-item">
            <strong>5. Pelepasan (Removal)</strong>
            <p>Lepaskan gembok dan tanda setelah pekerjaan selesai dan switch gear aman untuk dioperasikan kembali.</p>
          </div>
        </div>
      </section>
    </>
  );
}
