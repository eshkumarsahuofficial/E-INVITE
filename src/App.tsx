import { useCallback, useEffect, useState } from 'react';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PublicInvitationPage } from './components/public/PublicInvitationPage';
import { StudioHomePage } from './components/studio/StudioHomePage';

function resolveRoute(pathname: string): { type: 'home' | 'admin' | 'invite'; slug?: string } {
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  if (!clean) return { type: 'home' };
  if (clean === 'admin') return { type: 'admin' };
  if (clean.startsWith('invite/')) {
    const slug = clean.slice('invite/'.length).split('/')[0];
    if (slug) return { type: 'invite', slug };
  }
  if (/^[a-z0-9-]+$/.test(clean)) {
    return { type: 'invite', slug: clean };
  }
  return { type: 'home' };
}

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname) return;
    window.history.pushState({}, '', to);
    setPathname(to);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const route = resolveRoute(pathname);

  return (
    <ErrorBoundary>
      {route.type === 'admin' && <AdminDashboard onNavigate={navigate} />}
      {route.type === 'invite' && route.slug && (
        <PublicInvitationPage slug={route.slug} onNavigate={navigate} />
      )}
      {route.type === 'home' && <StudioHomePage onNavigate={navigate} />}
    </ErrorBoundary>
  );
}
