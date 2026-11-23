import { Outlet } from 'react-router-dom';
import slcLogo from '@/assets/slc-logo.png';

/**
 * Minimal layout for public pages (login, registration).
 * Centered content on the flat brand canvas, with the logo's flame gradient
 * (gold → orange → red) as a thin top rule.
 */
export function AppLayout() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent-400 via-flame-orange to-flame-red"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-md">
        <img
          src={slcLogo}
          alt="Supernatural Life Church"
          className="mx-auto mb-6 h-24 w-24 object-contain"
        />
        <Outlet />
      </div>
    </div>
  );
}
