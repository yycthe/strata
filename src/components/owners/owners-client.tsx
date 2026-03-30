'use client';

import { useState } from 'react';
import { Owner } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, FileSpreadsheet, Upload } from 'lucide-react';
import Papa from 'papaparse';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  buildBuildiumImportPayload,
  type ImportedOwnerRecord,
  type ImportedPropertyRecord,
} from '@/lib/buildium-import';

const BUILDIUM_SOURCE = 'buildium';
const BATCH_LIMIT = 400;

export function OwnersClient() {
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const ownersCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'owners') : null),
    [firestore, user]
  );
  const { data: owners, isLoading } = useCollection<Owner>(ownersCollection);

  const parseCsvFile = (file: File): Promise<unknown[]> =>
    new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
            return;
          }

          resolve(results.data as unknown[]);
        },
        error: (error) => reject(error),
      });
    });

  const commitChunkedWrites = async <T,>(
    items: T[],
    applyWrite: (batch: ReturnType<typeof writeBatch>, item: T) => void
  ) => {
    for (let index = 0; index < items.length; index += BATCH_LIMIT) {
      const batch = writeBatch(firestore);
      const chunk = items.slice(index, index + BATCH_LIMIT);
      chunk.forEach((item) => applyWrite(batch, item));
      await batch.commit();
    }
  };

  const deleteImportedDocs = async (collectionName: 'owners' | 'properties') => {
    const snapshot = await getDocs(
      query(collection(firestore, collectionName), where('source', '==', BUILDIUM_SOURCE))
    );

    if (snapshot.empty) {
      return;
    }

    await commitChunkedWrites(snapshot.docs, (batch, documentSnapshot) => {
      batch.delete(documentSnapshot.ref);
    });
  };

  const handleImport = async () => {
    if (!selectedFile || !firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: !user
          ? 'You must be logged in to import owners.'
          : selectedFile
            ? 'Firestore not available.'
            : 'Please choose a Buildium CSV export first.',
      });
      return;
    }

    setIsImporting(true);

    try {
      const rawRows = await parseCsvFile(selectedFile);
      const { owners: importedOwners, properties: importedProperties, stats } = buildBuildiumImportPayload(rawRows);

      await deleteImportedDocs('owners');
      await deleteImportedDocs('properties');

      await commitChunkedWrites(importedProperties, (batch, propertyRecord: ImportedPropertyRecord) => {
        batch.set(doc(collection(firestore, 'properties'), propertyRecord.docId), propertyRecord.data);
      });

      await commitChunkedWrites(importedOwners, (batch, ownerRecord: ImportedOwnerRecord) => {
        batch.set(doc(collection(firestore, 'owners'), ownerRecord.docId), ownerRecord.data);
      });

      toast({
        title: 'Import Successful',
        description:
          stats.unresolvedPlanCodes > 0
            ? `Imported ${stats.properties} properties and ${stats.owners} owner records. ${stats.unresolvedPlanCodes} rows still need manual plan-code cleanup.`
            : `Imported ${stats.properties} properties and ${stats.owners} owner records.`,
      });
      setIsDialogOpen(false);
      setSelectedFile(null);

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
              <Button disabled={!user}>
                <Upload className="mr-2 h-4 w-4" /> Import from CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
              <DialogTitle>Import Owners from CSV</DialogTitle>
                <CardDescription>
                  Upload a Buildium property export. We will derive owner groups, plan codes, and unit numbers for notice matching.
                </CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Buildium format</AlertTitle>
                  <AlertDescription>
                    Supported columns: <code>Property name</code>, <code>Address 1</code>, <code>City/Locality</code>,
                    <code> State/Province</code>, <code>Postal code</code>, <code>Rental owners</code>, and <code>Id</code>.
                    This import matches notices by strata plan code like <code>EPS5421</code> and unit numbers like <code>1908</code>.
                  </AlertDescription>
                </Alert>
                <div className="grid gap-2">
                  <Label htmlFor="buildium-csv">Buildium CSV file</Label>
                  <Input
                    id="buildium-csv"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  />
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{selectedFile.name}</span>
                  </div>
                )}
              </div>
              <Button onClick={handleImport} disabled={isImporting || !selectedFile}>
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
                <TableCell>{owner.email || 'No email on file'}</TableCell>
                <TableCell>{owner.properties.join(', ')}</TableCell>
              </TableRow>
            ))}
            {!isLoading && (!owners || owners.length === 0) && (
                <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                        { user ? 'No owners found in Firestore. Try importing some from a CSV file.' : 'Please log in to view owners.' }
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
