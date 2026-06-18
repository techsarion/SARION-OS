import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <p className="text-overline uppercase tracking-wide text-accent">404</p>
      <h1 className="text-h1">Page not found</h1>
      <p className="max-w-sm text-body-sm text-text-secondary">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link href="/" className={buttonVariants({ variant: 'primary', size: 'md' })}>
        Back to dashboard
      </Link>
    </div>
  );
}
