'use client';

import { useState, useMemo } from 'react';
import { Owner } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import Papa from 'papaparse';
import { z } from 'zod';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';

const CsvRowSchema = z.object({
  'Property name': z.string(),
  'Address 1': z.string(),
  City: z.string(),
  State: z.string(),
  'Postal code': z.string(),
  'Rental owners': z.string(),
});


export function OwnersClient() {
  const [isImporting, setIsImporting] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const ownersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'owners') : null),
    [firestore]
  );
  const { data: owners, isLoading } = useCollection<Owner>(ownersCollection);

  const handleImport = async () => {
    if (!csvData.trim() || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: csvData.trim() ? 'Firestore not available.' : 'CSV data cannot be empty.',
      });
      return;
    }

    setIsImporting(true);

    try {
      const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
      if (parsed.errors.length > 0) {
        throw new Error(`CSV Parsing Error: ${parsed.errors[0].message}`);
      }

      const rows = z.array(CsvRowSchema).parse(parsed.data);

      const parseOwnerString = (ownerStr: string) => {
        return ownerStr.split(',').map(part => {
            const match = part.trim().match(/(.*?)\s*<(.*?)>/);
            if (match) return { name: match[1].trim(), email: match[2].trim().toLowerCase() };
            return null;
        }).filter(Boolean) as {name: string, email: string}[];
      };

      const parsePropertyName = (propName: string) => {
        const planMatch = propName.match(/(BCS|EPS|LMS|VR|VAS)\s*(\d+)/i);
        const unitMatch = propName.match(/unit\s*#?(\w+)/i);
        return {
            planCode: planMatch ? `${planMatch[1].toUpperCase()}${planMatch[2]}`: null,
            unitNumber: unitMatch ? unitMatch[1] : null,
        }
      };

      // In a real-world scenario, you might want to check for existing owners first.
      // For this MVP, we will just add all owners from the CSV.
      const importPromises = [];

      for (const row of rows) {
        const { planCode, unitNumber } = parsePropertyName(row['Property name']);
        const propertyIdentifier = `${planCode || row['Property name']}${unitNumber ? ' - ' + unitNumber : ''}`;
        const parsedOwners = parseOwnerString(row['Rental owners']);
        
        for (const owner of parsedOwners) {
            const newOwner: Omit<Owner, 'id'> = {
                name: owner.name,
                email: owner.email,
                properties: [propertyIdentifier]
            };
            importPromises.push(addDoc(collection(firestore, 'owners'), newOwner));
        }
      }

      await Promise.all(importPromises);

      toast({
        title: 'Import Successful',
        description: `Successfully started import for ${rows.length} rows. Owners will appear shortly.`,
      });
      setIsDialogOpen(false);
      setCsvData('');

    } catch (error: any) {
      console.error("CSV Import Error:", error);
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: error.message || "An unknown error occurred during import."
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>All Owners</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" /> Import from CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Import Owners from CSV</DialogTitle>
                <CardDescription>
                  Paste your CSV content below. Required headers: "Property name", "Address 1", "City", "State", "Postal code", "Rental owners".
                </CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Textarea
                  placeholder="Paste CSV data here..."
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  className="h-64"
                />
              </div>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Properties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Loading owners...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && owners?.map((owner) => (
              <TableRow key={owner.id}>
                <TableCell>{owner.name}</TableCell>
                <TableCell>{owner.email}</TableCell>
                <TableCell>{owner.properties.join(', ')}</TableCell>
              </TableRow>
            ))}
            {!isLoading && (!owners || owners.length === 0) && (
                <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No owners found in Firestore. Try importing some from a CSV file.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
