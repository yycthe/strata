import { getOwners } from '@/lib/data';
import { OwnersClient } from '@/components/owners/owners-client';

export default async function OwnersPage() {
  const owners = await getOwners();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">
          Owners
        </h1>
      </div>
      <OwnersClient owners={owners} />
    </div>
  );
}
