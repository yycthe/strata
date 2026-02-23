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
} from 'lucide-react';
import { StrataPulseLogo } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState } from 'react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menuItems = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/gmail-sync', label: 'Gmail Sync', icon: Mail },
    { href: '/inbox', label: 'Inbox Queue', icon: Inbox },
    { href: '/history', label: 'Sent History', icon: Send },
    { href: '/properties', label: 'Properties', icon: Building },
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <StrataPulseLogo className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <h2 className="font-headline text-lg font-semibold">
                StrataPulse Pro
              </h2>
              <p className="text-xs text-muted-foreground">Notice Workflow</p>
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
          <Separator className="my-2" />
          <SystemStatus />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
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
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4" />
        <span>System Status</span>
      </div>
      <Badge variant={isOnline ? 'default' : 'destructive'} className="bg-green-500 text-white data-[state=offline]:bg-red-500">
        {isOnline ? 'Online' : 'Offline'}
      </Badge>
    </div>
  );
}
