import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAdminJWT } from '@/lib/adminAuth';
import { ReactNode } from 'react';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Require admin auth for ALL /admin routes, irrespective of page components
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value || cookieStore.get('auth_token')?.value;
  if (!token) {
    redirect('/login?redirect=' + encodeURIComponent('/admin'));
  }
  try {
    verifyAdminJWT(token);
  } catch {
    redirect('/login?redirect=' + encodeURIComponent('/admin'));
  }

  // Add top padding to avoid any fixed navbar overlapping the admin content
  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
