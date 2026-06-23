'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { MENU_ITEMS, PAGE_ROLE_ACCESS } from '@/lib/types';

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { sidebarOpen, closeSidebar } = useSidebar();
  const role = user?.role || '';

  const currentPath = pathname || '/';
  const currentPage = currentPath === '/' ? 'dashboard' : currentPath.split('/').filter(Boolean)[0] || 'dashboard';

  const fullName = user?.fullName || 'Admin K3';
  const userRole = user?.role || 'Operator';
  const initials = fullName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} id="sidebar">
      <div className="logo-area">
        <h2 className="logo-text">
          <i className="fa-solid fa-shield-halved"></i>
          <span>LOTOTO K3</span>
        </h2>
        <button className="sidebar-close" onClick={closeSidebar} aria-label="Close sidebar">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      {/* User card in sidebar */}
      <div className="sidebar-user">
        <div className="sidebar-user-avatar">{initials}</div>
        <div className="sidebar-user-meta">
          <strong>{fullName}</strong>
          <span>{userRole}</span>
        </div>
      </div>

      <ul className="menu">
        {MENU_ITEMS.filter((item) => {
          const allowedRoles = PAGE_ROLE_ACCESS[item.page];
          return allowedRoles ? allowedRoles.includes(role) : false;
        }).map((item) => (
          <li key={item.href} className={currentPage === item.page ? 'active' : ''}>
            <Link href={item.href} onClick={closeSidebar}>
              <i className={`fa-solid ${item.icon}`}></i>
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
        <li className="menu-spacer" />
        <li>
          <Link href="/logout" onClick={closeSidebar}>
            <i className="fa-solid fa-right-from-bracket"></i>
            <span>Logout</span>
          </Link>
        </li>
      </ul>
    </aside>
  );
}
