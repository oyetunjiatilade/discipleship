import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="font-display text-7xl font-extrabold text-brand-200">404</p>
      <h1 className="font-display text-xl font-bold text-brand-800">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild className="mt-2 gap-2">
        <Link to="/">
          <Home className="h-4 w-4" />
          Go Home
        </Link>
      </Button>
    </div>
  );
}
