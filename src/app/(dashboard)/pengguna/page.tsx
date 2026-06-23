'use client';

import { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/Topbar';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { fetchProfiles, insertProfile, updateProfile, deleteProfile, hashPassword } from '@/lib/utils';
import type { Profile } from '@/lib/types';

export default function PenggunaPage() {
  const { user, canManageUsers } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    full_name: '',
    username: '',
    password: '',
    email: '',
    role: 'operator',
    department: '',
    status: 'active',
  });
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    const data = await fetchProfiles();
    setProfiles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      id: '',
      full_name: '',
      username: '',
      password: '',
      email: '',
      role: 'operator',
      department: '',
      status: 'active',
    });
    setFeedback(null);
    setModalVisible(true);
  };

  const openEditModal = (profile: Profile) => {
    setEditingId(profile.id);
    setFormData({
      id: profile.id,
      full_name: profile.full_name,
      username: profile.username,
      password: '',
      email: profile.email,
      role: profile.role,
      department: profile.department,
      status: profile.status,
    });
    setFeedback(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setTimeout(() => setFeedback(null), 300);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    // Validation
    if (!formData.full_name.trim() || !formData.username.trim() || !formData.email.trim()) {
      setFeedback({ message: 'Harap isi semua field yang wajib.', type: 'error' });
      return;
    }

    if (!editingId && !formData.password.trim()) {
      setFeedback({ message: 'Password wajib diisi untuk pengguna baru.', type: 'error' });
      return;
    }

    // Check duplicate username
    const duplicate = profiles.find(
      (p) => p.username.toLowerCase() === formData.username.trim().toLowerCase() && p.id !== (editingId || formData.id)
    );
    if (duplicate) {
      setFeedback({ message: 'Username sudah digunakan. Silakan gunakan username lain.', type: 'error' });
      return;
    }

    const record: Record<string, unknown> = {
      full_name: formData.full_name.trim(),
      username: formData.username.trim(),
      email: formData.email.trim(),
      role: formData.role,
      department: formData.department,
      status: formData.status,
    };

    if (formData.password.trim()) {
      record.hashed_password = await hashPassword(formData.password);
    }

    if (editingId) {
      const result = await updateProfile(editingId, record);
      if (result) {
        setFeedback({ message: 'Pengguna berhasil diperbarui.', type: 'success' });
        await loadProfiles();
        setTimeout(closeModal, 1500);
      } else {
        setFeedback({ message: 'Gagal memperbarui pengguna. Silakan coba lagi.', type: 'error' });
      }
    } else {
      const result = await insertProfile(record);
      if (result) {
        setFeedback({ message: 'Pengguna berhasil ditambahkan.', type: 'success' });
        await loadProfiles();
        setTimeout(closeModal, 1500);
      } else {
        setFeedback({ message: 'Gagal menambahkan pengguna. Silakan coba lagi.', type: 'error' });
      }
    }
  };

  const handleDelete = async (id: string, fullName: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus pengguna "${fullName}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    const result = await deleteProfile(id);
    if (result) {
      setFeedback({ message: `Pengguna "${fullName}" berhasil dihapus.`, type: 'success' });
      await loadProfiles();
    } else {
      setFeedback({ message: 'Gagal menghapus pengguna. Silakan coba lagi.', type: 'error' });
    }
  };

  const getRoleBadgeClass = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'badge red';
      case 'operator':
        return 'badge yellow';
      case 'viewer':
        return 'badge gray';
      default:
        return 'badge';
    }
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'active':
        return 'badge green';
      case 'inactive':
        return 'badge yellow';
      case 'pending':
        return 'badge red';
      default:
        return 'badge';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'active':
        return 'Aktif';
      case 'inactive':
        return 'Tidak Aktif';
      case 'pending':
        return 'Menunggu';
      default:
        return status;
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'operator':
        return 'Operator';
      case 'viewer':
        return 'Viewer';
      default:
        return role;
    }
  };

  const totalUsers = profiles.length;
  const activeUsers = profiles.filter((p) => p.status === 'active').length;
  const pendingUsers = profiles.filter((p) => p.status === 'pending').length;

  return (
    <>
      <Topbar
        title="Manajemen Pengguna"
        subtitle="Kelola akun pengguna dan hak akses untuk dashboard LOTOTO K3."
      />

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`feedback-message is-visible ${feedback.type === 'error' ? 'error' : ''}`}
          style={{ marginBottom: '22px' }}
        >
          <i className={`fa-solid ${feedback.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
          {' '}{feedback.message}
        </div>
      )}

      {/* Cards Row */}
      <section className="cards">
        <div className="card">
          <h2>{totalUsers}</h2>
          <span>Total Pengguna</span>
        </div>
        <div className="card success-card">
          <h2>{activeUsers}</h2>
          <span>Pengguna Aktif</span>
        </div>
        <div className="card warning-card">
          <h2>{pendingUsers}</h2>
          <span>Menunggu Aktivasi</span>
        </div>
        <div className="card">
          <h2 style={{ textTransform: 'capitalize' }}>{user?.role || '-'}</h2>
          <span>Role Anda</span>
        </div>
      </section>

      {canManageUsers ? (
        <>
          {/* Table */}
          <section className="table-section">
            <div className="table-header">
              <div>
                <h2>Daftar Pengguna</h2>
                <p>Kelola data pengguna dan hak akses sistem.</p>
              </div>
              <button className="button primary" onClick={openAddModal}>
                <i className="fa-solid fa-plus"></i> Tambah Pengguna
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Departemen</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                      <i className="fa-solid fa-spinner fa-spin"></i> Memuat data...
                    </td>
                  </tr>
                ) : profiles.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                      Belum ada data pengguna. Klik &quot;Tambah Pengguna&quot; untuk menambahkan.
                    </td>
                  </tr>
                ) : (
                  profiles.map((profile) => (
                    <tr key={profile.idIndex}>
                      <td data-label="Nama">{profile.full_name}</td>
                      <td data-label="Username">{profile.username}</td>
                      <td data-label="Email">{profile.email}</td>
                      <td data-label="Role">
                        <span className={getRoleBadgeClass(profile.role)}>
                          {getRoleLabel(profile.role)}
                        </span>
                      </td>
                      <td data-label="Departemen">{profile.department || '-'}</td>
                      <td data-label="Status">
                        <span className={getStatusBadgeClass(profile.status)}>
                          {getStatusLabel(profile.status)}
                        </span>
                      </td>
                      <td data-label="Aksi">
                        <button
                          className="button secondary"
                          onClick={() => openEditModal(profile)}
                          style={{ marginRight: '8px' }}
                        >
                          <i className="fa-solid fa-pen"></i> Edit
                        </button>
                        <button
                          className="button danger"
                          onClick={() => handleDelete(profile.id, profile.full_name)}
                        >
                          <i className="fa-solid fa-trash"></i> Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          {/* Role Descriptions */}
          <section className="info-box">
            <div className="info-item">
              <strong><i className="fa-solid fa-shield-halved" style={{ color: '#ef4444', marginRight: '6px' }}></i> Admin</strong>
              <p style={{ marginTop: '4px' }}>Akses penuh ke seluruh fitur dan halaman, termasuk manajemen pengguna.</p>
            </div>
            <div className="info-item">
              <strong><i className="fa-solid fa-user-gear" style={{ color: '#f59e0b', marginRight: '6px' }}></i> Operator</strong>
              <p style={{ marginTop: '4px' }}>Dapat membuat, mengedit, dan melihat data switch gear dan LOTOTO.</p>
            </div>
            <div className="info-item">
              <strong><i className="fa-solid fa-eye" style={{ color: '#64748b', marginRight: '6px' }}></i> Viewer</strong>
              <p style={{ marginTop: '4px' }}>Hanya dapat melihat data dan laporan, tidak dapat mengubah data.</p>
            </div>
          </section>

          {/* User Modal */}
          <Modal
            isVisible={modalVisible}
            onClose={closeModal}
            title={editingId ? 'Edit Pengguna' : 'Tambah Pengguna'}
          >
            <form onSubmit={handleSubmit}>
              <input type="hidden" name="id" value={formData.id} />

              <div className="form-row">
                <label htmlFor="full_name">Nama Lengkap</label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>

              <div className="form-row">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Masukkan username"
                  required
                />
              </div>

              <div className="form-row">
                <label htmlFor="password">
                  Password {editingId && <span className="text-muted">(kosongkan jika tidak diubah)</span>}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={editingId ? 'Biarkan kosong jika tidak diubah' : 'Masukkan password'}
                />
              </div>

              <div className="form-row">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Masukkan alamat email"
                  required
                />
              </div>

              <div className="form-row">
                <label htmlFor="role">Role</label>
                <select id="role" name="role" value={formData.role} onChange={handleChange}>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div className="form-row">
                <label htmlFor="department">Departemen</label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="Masukkan departemen"
                />
              </div>

              <div className="form-row">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" value={formData.status} onChange={handleChange}>
                  <option value="active">Aktif</option>
                  <option value="inactive">Tidak Aktif</option>
                  <option value="pending">Menunggu</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="button secondary" onClick={closeModal}>
                  Batal
                </button>
                <button type="submit" className="button primary">
                  {editingId ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                </button>
              </div>
            </form>
          </Modal>
        </>
      ) : (
        <div className="info-box" style={{ padding: '30px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8' }}>
            <i className="fa-solid fa-lock" style={{ fontSize: '36px', display: 'block', marginBottom: '12px' }}></i>
            Anda tidak memiliki akses ke halaman ini. Hanya admin yang dapat mengelola pengguna.
          </p>
        </div>
      )}
    </>
  );
}
