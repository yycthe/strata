import { OwnersClient } from '@/components/owners/owners-client';
import { getOwners } from '@/lib/data';
import { hasFirebaseAdminConfig } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export default async function OwnersPage() {
  const owners = await getOwners();
  const importEnabled = hasFirebaseAdminConfig();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold tracking-tight md:text-2xl">
          Owners
        </h1>
      </div>
      <OwnersClient initialOwners={owners} importEnabled={importEnabled} />
    </div>
  );
}
