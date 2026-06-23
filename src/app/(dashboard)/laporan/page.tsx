'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Topbar from '@/components/Topbar';
import { useAuth } from '@/context/AuthContext';
import { fetchActivityLogs } from '@/lib/utils';
import type { ActivityLog } from '@/lib/types';
import { STATUS_BADGE_CLASS } from '@/lib/types';

function getStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === 'normal' || s === 'selesai') return 'Selesai';
  if (s === 'maintenance') return 'Maintenance';
  if (['berjalan', 'aktif', 'active', 'lototo'].includes(s)) return 'Berjalan';
  return status;
}

function getBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'normal' || s === 'selesai') return STATUS_BADGE_CLASS.normal || 'green';
  if (s === 'maintenance') return STATUS_BADGE_CLASS.maintenance || 'yellow';
  if (['berjalan', 'aktif', 'active', 'lototo'].includes(s)) return STATUS_BADGE_CLASS.lototo || 'red';
  return 'green';
}

export default function LaporanPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const logs = await fetchActivityLogs();
    setActivityLogs(logs);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter logs by date range
  const filteredLogs = activityLogs.filter((log) => {
    if (!startDate && !endDate) return true;

    // Parse DD/MM/YYYY HH:MM → Date
    if (!log.logged_at) return true;
    const parts = log.logged_at.split(' ');
    const dateParts = parts[0]?.split('/');
    if (!dateParts || dateParts.length !== 3) return true;
    const logDate = new Date(
      Number(dateParts[2]),
      Number(dateParts[1]) - 1,
      Number(dateParts[0])
    );

    if (startDate) {
      const start = new Date(startDate + 'T00:00:00');
      if (logDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59');
      if (logDate > end) return false;
    }
    return true;
  });

  const scheduledMaintenance = filteredLogs.filter(
    (log) =>
      log.action.toLowerCase().includes('maintenance') ||
      log.status.toLowerCase().includes('maintenance')
  ).length;

  const handleExportPDF = useCallback(() => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN AKTIVITAS LOTOTO K3', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    doc.text(`Dicetak: ${now}`, pageWidth / 2, 28, { align: 'center' });

    // Periode filter
    let periodeText = 'Periode: Semua data';
    if (startDate && endDate) {
      periodeText = `Periode: ${startDate} s/d ${endDate}`;
    } else if (startDate) {
      periodeText = `Periode: mulai ${startDate}`;
    } else if (endDate) {
      periodeText = `Periode: sampai ${endDate}`;
    }
    doc.setFontSize(9);
    doc.text(periodeText, pageWidth / 2, 36, { align: 'center' });

    // Line
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.8);
    doc.line(14, 40, pageWidth - 14, 40);

    // Summary
    const completed = filteredLogs.filter(
      (log) => log.status.toLowerCase() === 'normal' || log.status.toLowerCase() === 'selesai'
    ).length;
    const inProg = filteredLogs.filter((log) =>
      ['berjalan', 'aktif', 'active', 'lototo'].includes(log.status.toLowerCase())
    ).length;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Aktivitas: ${filteredLogs.length}  |  Selesai: ${completed}  |  Berjalan: ${inProg}  |  Maintenance Terjadwal: ${scheduledMaintenance}`, pageWidth / 2, 47, { align: 'center' });

    // Table
    const tableData = filteredLogs.map((log) => [
      log.logged_at || '-',
      log.switch_gear_name || '-',
      log.action || '-',
      log.description || '-',
      log.pic || '-',
      getStatusLabel(log.status),
    ]);

    autoTable(doc, {
      startY: 54,
      head: [['Tanggal', 'Switch Gear', 'Jenis Aktivitas', 'Deskripsi', 'PIC', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      styles: {
        halign: 'left',
        valign: 'middle',
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 },
      },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Halaman ${data.pageNumber} dari ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      },
    });

    doc.save('laporan-lototo-k3.pdf');
  }, [filteredLogs, scheduledMaintenance, startDate, endDate]);

  const totalActivities = filteredLogs.length;
  const completedActivities = filteredLogs.filter(
    (log) => log.status.toLowerCase() === 'normal' || log.status.toLowerCase() === 'selesai'
  ).length;
  const inProgress = filteredLogs.filter((log) =>
    ['berjalan', 'aktif', 'active', 'lototo'].includes(log.status.toLowerCase())
  ).length;

  return (
    <>
      <Topbar
        title="Laporan LOTOTO"
        subtitle="Riwayat dan laporan aktivitas pengamanan LOTOTO serta maintenance switch gear."
      />

      <section className="cards">
        <div className="card">
          <h2>{totalActivities}</h2>
          <span>Total Aktivitas</span>
        </div>
        <div className="card success-card">
          <h2>{completedActivities}</h2>
          <span>LOTOTO Selesai</span>
        </div>
        <div className="card warning-card" onClick={() => router.push('/maintenance')} style={{ cursor: 'pointer' }}>
          <h2>{scheduledMaintenance}</h2>
          <span>Maintenance Terjadwal</span>
        </div>
        <div className="card active-card" onClick={() => router.push('/lototo-aktif')} style={{ cursor: 'pointer' }}>
          <h2>{inProgress}</h2>
          <span>Sedang Berjalan</span>
        </div>
      </section>

      <section className="table-section">
        <div className="table-header">
          <div>
            <h2>Riwayat Aktivitas</h2>
            <p>Data aktivitas LOTOTO dan maintenance switch gear.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: '8px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '10px',
                  fontSize: '13px',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                }}
              />
              <span style={{ color: '#64748b', fontSize: '13px' }}>s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: '8px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '10px',
                  fontSize: '13px',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                }}
              />
              {(startDate || endDate) && (
                <button
                  className="button secondary"
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  style={{ padding: '8px 12px', minHeight: '36px', fontSize: '12px' }}
                >
                  <i className="fa-solid fa-times"></i> Reset
                </button>
              )}
            </div>
            <button className="button secondary" onClick={handleExportPDF}>
              <i className="fa-solid fa-download"></i> Unduh Laporan
            </button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Switch Gear</th>
              <th>Jenis Aktivitas</th>
              <th>Deskripsi</th>
              <th>PIC</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                  Memuat data...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                  {activityLogs.length === 0 ? 'Tidak ada data aktivitas.' : 'Tidak ada data untuk filter tanggal yang dipilih.'}
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td data-label="Tanggal">{log.logged_at}</td>
                  <td data-label="Switch Gear">{log.switch_gear_name}</td>
                  <td data-label="Aktivitas">{log.action}</td>
                  <td data-label="Deskripsi">{log.description}</td>
                  <td data-label="PIC">{log.pic}</td>
                  <td data-label="Status">
                    <span className={`badge ${getBadgeClass(log.status)}`}>
                      {getStatusLabel(log.status)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
