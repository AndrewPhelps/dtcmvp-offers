import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/serverAuth';
import { listApps, type ListApp } from '@/lib/scrapeDb';
import ScrapeResultsClient from './ScrapeResultsClient';

export const dynamic = 'force-dynamic';

export default async function ScrapeResultsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login?redirect=/scrape-results');
  }

  if (!user.is_admin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
          Admin access required
        </h2>
        <p className="text-[var(--text-secondary)]">
          You&apos;re signed in as {user.email}, but this page is only
          available to admins. Ask Peter or Jake if you need access.
        </p>
      </div>
    );
  }

  let apps: ListApp[] = [];
  let loadError: string | null = null;
  try {
    apps = listApps();
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
    console.error('[scrape-results/page] listApps failed:', loadError);
  }

  return (
    <ScrapeResultsClient
      initialApps={apps}
      loadError={loadError}
      viewerEmail={user.email}
    />
  );
}
