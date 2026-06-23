'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import ApprovalPanel from './ApprovalPanel';

interface TopbarProps {
  title: string;
  subtitle: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const { user } = useAuth();
  const { toggleSidebar, sidebarOpen } = useSidebar();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
    }
  }, []);

  const toggleTheme = () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <i className={`fa-solid ${sidebarOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
        </button>
        <div className="topbar-title-group">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="topbar-actions">
        {user?.role === 'admin' && <ApprovalPanel />}
        <button
          id="themeToggle"
          className="icon-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{ color: 'var(--text)' }}
        >
          <i className="fa-solid fa-moon"></i>
        </button>
      </div>
    </header>
  );
}
