'use client';

import { SidebarProvider, useSidebar } from '@/context/SidebarContext';
import Sidebar from '@/components/Sidebar';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, closeSidebar } = useSidebar();

  return (
    <div className="layout">
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar} />
      <Sidebar />
      <main className="main-content" onClick={() => sidebarOpen && closeSidebar()}>
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
