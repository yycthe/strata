import { getProperties } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Property } from '@/lib/definitions';

export const dynamic = 'force-dynamic';

export default async function PropertiesPage() {
  const properties: Property[] = await getProperties();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">
          Properties
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Plan Code</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((prop) => (
                <TableRow key={prop.id}>
                  <TableCell>{prop.name}</TableCell>
                  <TableCell>{`${prop.address_1}, ${prop.city}`}</TableCell>
                  <TableCell>{prop.plan_code}</TableCell>
                  <TableCell>{prop.unit_number}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
