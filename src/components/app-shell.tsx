'use client';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Mail,
  Inbox,
  Send,
  Building,
  Activity,
  Users,
} from 'lucide-react';
import { StrataPulseLogo } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { useFirebase } from '@/firebase';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith('/login')) {
    return <>{children}</>;
  }

  const menuItems = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/gmail-sync', label: 'Sync', icon: Mail },
    { href: '/inbox', label: 'Inbox', icon: Inbox },
    { href: '/history', label: 'History', icon: Send },
    { href: '/properties', label: 'Properties', icon: Building },
    { href: '/owners', label: 'Owners', icon: Users },
  ];

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-sidebar-border/80 bg-sidebar/95 backdrop-blur">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <StrataPulseLogo className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <h2 className="font-headline text-lg font-semibold tracking-tight">
                StrataPulse
              </h2>
              <p className="text-xs text-muted-foreground">Quiet notice workflow</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  size="lg"
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <AuthStatus />
          <Separator className="my-2" />
          <SystemStatus />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}

function AuthStatus() {
  const { auth, user, isUserLoading } = useFirebase();
  const pathname = usePathname();
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    setIsDemoMode(document.cookie.includes('strata_demo_mode=1'));
  }, [pathname]);

  if (isUserLoading) {
    return <div className="text-xs text-muted-foreground">Checking access...</div>;
  }

  if (user) {
    return (
      <div className="space-y-2 text-xs text-muted-foreground">
        {isDemoMode && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
            Demo mode is on. This session is showing sample data only.
          </div>
        )}
        <div className="rounded-xl border border-sidebar-border/80 bg-white/70 px-3 py-2">
          Signed in as {user.isAnonymous ? 'Anonymous' : user.email}
        </div>
        {isDemoMode && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/api/demo-mode?enable=0&redirect=${encodeURIComponent(pathname)}`}>
              Exit Demo
            </Link>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={isSigningOut}
          onClick={async () => {
            setIsSigningOut(true);
            try {
              await fetch('/api/auth/session', { method: 'DELETE' });
            } finally {
              await auth.signOut();
              window.location.href = '/login';
            }
          }}
        >
          {isSigningOut ? 'Logging out...' : 'Logout'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href="/login">
          Go to Login
        </Link>
      </Button>
      <p className="px-1 text-[11px] leading-4 text-muted-foreground">
        Access is now controlled by Firebase email/password sign-in only.
      </p>
    </div>
  );
}


function SystemStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // This is a simple client-side check. A real implementation might poll a health endpoint.
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex items-center justify-between rounded-xl border border-sidebar-border/80 bg-white/70 px-3 py-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4" />
        <span>System</span>
      </div>
      <Badge
        variant={isOnline ? 'default' : 'destructive'}
        className="border-0 bg-primary/90 text-primary-foreground shadow-none data-[state=offline]:bg-destructive"
      >
        {isOnline ? 'Online' : 'Offline'}
      </Badge>
    </div>
  );
}
