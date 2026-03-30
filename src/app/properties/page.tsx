import { getProperties } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Property } from '@/lib/definitions';
import { requireAdminSession } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

export default async function PropertiesPage() {
  const demoMode = await isDemoModeEnabled();
  if (!demoMode) {
    await requireAdminSession();
  }
  const properties: Property[] = await getProperties();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold tracking-tight md:text-2xl">
          Properties
        </h1>
      </div>
      <Card className="border-border/70 bg-white/90 shadow-none">
        <CardHeader>
          <CardTitle className="tracking-tight">All Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Locator</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Strata Number</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No properties imported yet.
                  </TableCell>
                </TableRow>
              )}
              {properties.map((prop) => (
                <TableRow key={prop.id}>
                  <TableCell>{prop.locator_code || '—'}</TableCell>
                  <TableCell>{prop.owner_name || '—'}</TableCell>
                  <TableCell>{prop.name}</TableCell>
                  <TableCell>{[prop.address_1, prop.city].filter(Boolean).join(', ') || '—'}</TableCell>
                  <TableCell>{prop.plan_code || '—'}</TableCell>
                  <TableCell>{prop.unit_number || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
