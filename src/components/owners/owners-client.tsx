'use client';

import { useState } from 'react';
import { Owner } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { importOwnersFromCsv } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';
import { Textarea } from '../ui/textarea';

export function OwnersClient({ owners }: { owners: Owner[] }) {
  const [isImporting, setIsImporting] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!csvData.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'CSV data cannot be empty.',
      });
      return;
    }

    setIsImporting(true);
    const result = await importOwnersFromCsv(csvData);
    setIsImporting(false);
    
    if (result.success) {
      toast({
        title: 'Import Successful',
        description: result.message,
      });
      setIsDialogOpen(false);
      setCsvData('');
    } else {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: result.message,
      });
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
            {owners.map((owner) => (
              <TableRow key={owner.id}>
                <TableCell>{owner.name}</TableCell>
                <TableCell>{owner.email}</TableCell>
                <TableCell>{owner.properties.join(', ')}</TableCell>
              </TableRow>
            ))}
            {owners.length === 0 && (
                <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No owners found. Try importing some from a CSV file.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
