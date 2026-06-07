'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthProvider from '@/components/AuthProvider';

type UserRole = 'ADMIN' | 'STAFF' | 'TECHNICIAN' | 'SUPERVISOR' | 'MANAGEMENT';

// Must match the ROLE_MENU_ACCESS in Sidebar.tsx
const ROLE_ALLOWED_ROUTES: Record<Exclude<UserRole, 'ADMIN'>, string[]> = {
  MANAGEMENT: ['/dashboard', '/lantai-2', '/lantai-3'],
  STAFF: ['/dashboard', '/lantai-2', '/lantai-3', '/nurse-schedule', '/scheduler'],
  TECHNICIAN: ['/lantai-2', '/lantai-3', '/machine-management'],
  SUPERVISOR: [
    '/dashboard', '/lantai-2', '/lantai-3', '/nurse-schedule', '/scheduler',
    '/queue', '/patient-management', '/machine-management', '/user-management',
  ],
};

function isRouteAllowed(role: UserRole, pathname: string): boolean {
  if (role === 'ADMIN') return true;
  const allowed = ROLE_ALLOWED_ROUTES[role] || [];
  return allowed.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

function getDefaultRoute(role: UserRole): string {
  if (role === 'ADMIN') return '/dashboard';
  const allowed = ROLE_ALLOWED_ROUTES[role];
  return allowed?.[0] || '/dashboard';
}

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userRole = ((session?.user as any)?.role || 'STAFF') as UserRole;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Route-level access control: redirect if user tries to access unauthorized routes
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      if (!isRouteAllowed(userRole, pathname)) {
        router.replace(getDefaultRoute(userRole));
      }
    }
  }, [status, session, userRole, pathname, router]);

  if (status === 'loading') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f4f8',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner spinner-dark" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 13, color: '#64748b' }}>Memuat...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  // Don't render page content if route is not allowed (will redirect)
  if (!isRouteAllowed(userRole, pathname)) return null;

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        {/* Mobile topbar hamburger button */}
        <button
          className="sidebar-hamburger"
          onClick={() => setSidebarOpen(true)}
          aria-label="Buka menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProtectedContent>{children}</ProtectedContent>
    </AuthProvider>
  );
}

