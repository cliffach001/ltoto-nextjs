'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { authenticateUser } from '@/lib/utils';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    if (!username || !password) {
      setMessage('Isi username dan password terlebih dahulu.');
      setIsError(true);
      return;
    }

    const user = await authenticateUser(username, password);
    if (user && user.id) {
      login(
        user.username || username,
        user.role || 'operator',
        user.full_name || ''
      );
      return;
    }

    setMessage('Username atau password salah. Pastikan akun sudah terdaftar dan aktif.');
    setIsError(true);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <i className="fa-solid fa-shield-halved"></i>
          <h1>LOTOTO K3</h1>
          <p>Sistem Manajemen Keselamatan Kerja</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="demo-credentials">
            <i className="fa-solid fa-circle-info"></i>
            Login menggunakan username dan password yang dibuat pada halaman Pengguna.
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label
              htmlFor="username"
              style={{
                display: 'block',
                fontWeight: 600,
                color: 'var(--text)',
                marginBottom: '8px',
                fontSize: '14px',
              }}
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px',
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontWeight: 600,
                color: 'var(--text)',
                marginBottom: '8px',
                fontSize: '14px',
              }}
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px',
              }}
            />
          </div>

          {message && (
            <div
              style={{
                color: isError ? '#b91c1c' : '#166534',
                background: isError ? '#fee2e2' : '#dcfce7',
                borderRadius: '10px',
                padding: '10px',
                marginBottom: '16px',
                fontSize: '14px',
              }}
            >
              {message}
            </div>
          )}

          <button type="submit" className="login-btn">
            <i className="fa-solid fa-sign-in-alt"></i> Login
          </button>

          <div className="login-footer">
            <p style={{ margin: '16px 0' }}>© 2026 LOTOTO K3 Dashboard. All rights reserved.</p>
          </div>
        </form>
      </div>
    </div>
  );
}
