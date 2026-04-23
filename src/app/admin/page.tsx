import { redirect } from 'next/navigation';

// /admin lands on the 1800dtc apps list by default. New admin views are
// added as siblings of this file; the topbar in admin/layout.tsx renders
// the shared tab row.
export default function AdminIndexPage() {
  redirect('/admin/scrape-results');
}
