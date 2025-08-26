// src/components/Layout.tsx

import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AccountSelector } from './AccountSelector';
import { ThemeToggle } from './ThemeToggle';
import { Users, UserPlus, Upload, Key, UserCog, Mail, UserCheck } from 'lucide-react'; // <-- IMPORT NEW ICON

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Bulk Signup', href: '/bulk-signup', icon: UserPlus },
  { name: 'Reset Passwords', href: '/reset-passwords', icon: Key },
  { name: 'Bulk Import', href: '/bulk-import', icon: Upload },
  { name: 'Single User Import', href: '/single-user-import', icon: UserCheck }, // <-- ADD NEW NAV LINK
  { name: 'User Management', href: '/user-management', icon: UserCog },
  { name: 'Email Templates', href: '/email-templates', icon: Mail },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background grid-pattern transition-colors duration-300">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-nav-background border-r border-nav-border">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-nav-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Clerk Manager</h1>
                <p className="text-xs text-muted-foreground">User Management</p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          {/* Account Selector */}
          <div className="px-6 py-4 border-b border-nav-border">
            <AccountSelector />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-6 py-4">
            <div className="space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-nav-border">
            <p className="text-xs text-muted-foreground">
              Built for multi-account Clerk management
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}