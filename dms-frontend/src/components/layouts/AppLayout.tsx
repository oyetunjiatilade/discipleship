import { Outlet } from 'react-router-dom';

/**
 * Minimal layout for public pages (login, registration).
 * Centered content with a subtle brand background.
 */
export function AppLayout() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 p-4">
      {/* Decorative shapes */}
      <div className="pointer-events-none absolute left-0 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-100/50 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 translate-x-1/3 translate-y-1/3 rounded-full bg-accent-100/40 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
