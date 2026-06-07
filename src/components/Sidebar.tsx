'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Image from "next/image";
import jkcIcon from "../../jkc-icon.png";
import { useEffect, useMemo } from 'react';

type UserRole = 'ADMIN' | 'STAFF' | 'TECHNICIAN' | 'SUPERVISOR' | 'MANAGEMENT';

// Define which roles can access each menu item
// ADMIN always has access to everything (handled in filtering logic)
const ROLE_MENU_ACCESS: Record<Exclude<UserRole, 'ADMIN'>, string[]> = {
  MANAGEMENT: ['/dashboard', '/lantai-2', '/lantai-3'],
  STAFF: ['/dashboard', '/lantai-2', '/lantai-3', '/nurse-schedule', '/scheduler'],
  TECHNICIAN: ['/lantai-2', '/lantai-3', '/machine-management'],
  SUPERVISOR: [
    '/dashboard', '/lantai-2', '/lantai-3', '/nurse-schedule', '/scheduler',
    '/queue', '/patient-management', '/machine-management', '/user-management',
  ],
};

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/lantai-2',
    label: 'Lantai 2',
    icon: (
      <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" />
      </svg>
    ),
  },
  {
    href: '/lantai-3',
    label: 'Lantai 3',
    icon: (
      <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" />
        <path d="M10 6h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/nurse-schedule',
    label: 'Nurse Schedule',
    icon: (
      <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/scheduler',
    label: 'Scheduler',
    icon: (
      <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="7" y1="15" x2="17" y2="15" strokeLinecap="round" />
        <line x1="7" y1="19" x2="13" y2="19" strokeLinecap="round" />
        <circle cx="18" cy="18" r="4" fill="currentColor" fillOpacity="0.15" />
        <path d="M18 16v2l1 1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/queue',
    label: 'Queue',
    icon: (
      <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 7h6M9 11h6M9 15h4" strokeLinecap="round" />
        <circle cx="6" cy="7" r="0.5" fill="currentColor" stroke="none" />
        <circle cx="6" cy="11" r="0.5" fill="currentColor" stroke="none" />
        <circle cx="6" cy="15" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: '/patient-management',
    label: 'Patient Management',
    icon: (
      <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 10H18M22 14H18M22 18H18" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/machine-management',
    label: 'Machine Management',
    icon: (
      <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
        <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/user-management',
    label: 'User Management',
    icon: (
      <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userRole = ((session?.user as any)?.role || 'STAFF') as UserRole;

  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  // Filter nav items based on user role
  const filteredNavItems = useMemo(() => {
    // ADMIN sees everything
    if (userRole === 'ADMIN') return navItems;

    const allowedPaths = ROLE_MENU_ACCESS[userRole] || [];
    return navItems.filter((item) => allowedPaths.includes(item.href));
  }, [userRole]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    onClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar${isOpen ? ' sidebar-mobile-open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <Image
                src={jkcIcon}
                alt="JKC Icon"
                width={42}
                height={42}
                className="rounded-lg"
                style={{ objectFit: 'contain', width: '100%', height: '100%' }}
              />
            </div>
            <div>
              <div className="sidebar-logo-text">JKC Dialysis</div>
              <div className="sidebar-subtitle">Management System</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Menu Utama</div>
          {filteredNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{session?.user?.name || 'User'}</div>
              <div className="sidebar-user-role">{userRole}</div>
            </div>
            <button
              className="logout-btn"
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Logout"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
