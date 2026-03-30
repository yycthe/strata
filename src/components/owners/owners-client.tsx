'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';

import type { Owner } from '@/lib/definitions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { BuildiumImportStats } from '@/lib/buildium-import';

type OwnersClientProps = {
  initialOwners: Array<Owner & { id: string }>;
  importEnabled: boolean;
  demoMode: boolean;
};

export function OwnersClient({ initialOwners, importEnabled, demoMode }: OwnersClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [lastImportStats, setLastImportStats] = useState<BuildiumImportStats | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const owners = initialOwners;
  const summary = useMemo(
    () => ({
      ownersWithPlanCodes: owners.filter((owner) => (owner.planCodes?.length ?? 0) > 0).length,
      ownersWithoutEmail: owners.filter((owner) => !owner.email).length,
      buildiumOwners: owners.filter((owner) => owner.source === 'buildium').length,
    }),
    [owners]
  );

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Choose a Buildium CSV export first.',
      });
      return;
    }

    setLastError(null);
    const formData = new FormData();
    formData.append('file', selectedFile);

    setIsImporting(true);

    try {
      const response = await fetch('/api/import/buildium', {
        method: 'POST',
        body: formData,
      });

      const rawPayload = await response.text();
      let payload: any = {};

      try {
        payload = rawPayload ? JSON.parse(rawPayload) : {};
      } catch {
        payload = { error: rawPayload || 'Buildium import failed.' };
      }

      if (!response.ok) {
        throw new Error(payload.error || 'Buildium import failed.');
      }

      setLastImportStats(payload.stats);
      setSelectedFile(null);
      setLastError(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      router.refresh();
      toast({
        title: 'Import complete',
        description:
          payload.stats.propertiesWithoutStrataNumber > 0
            ? `Imported ${payload.stats.properties} properties and ${payload.stats.owners} owner groups. ${payload.stats.propertiesWithoutStrataNumber} rows have no strata number, but their owner and address were still saved.`
            : `Imported ${payload.stats.properties} properties and ${payload.stats.owners} owner groups.`,
      });
    } catch (error: any) {
      const message = error.message || 'An unknown error occurred during import.';
      setLastError(message);
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: message,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm text-muted-foreground">
            Import one Buildium property export and the platform will normalize locator codes, strata plan codes, and unit numbers so each notice can match the right owner group.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-white/85 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Owner groups</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{owners.length}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-white/85 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">With strata</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{summary.ownersWithPlanCodes}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-white/85 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Match only</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{summary.ownersWithoutEmail}</div>
          </div>
        </div>
      </section>

      <Card className="border-border/70 bg-white/90 shadow-none">
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="tracking-tight">Import Buildium CSV</CardTitle>
              <CardDescription>
                Replaces previous Buildium-sourced owner and property records, then refreshes matching across the app.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">{summary.buildiumOwners} from Buildium</Badge>
              <Badge variant="outline">CSV only</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!importEnabled && !demoMode && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Buildium import is unavailable until `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` are configured on the server.
            </div>
          )}
          {demoMode && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Demo mode is active. Import is intentionally disabled so this walkthrough stays on sample owner data.
            </div>
          )}

          <label
            htmlFor="buildium-csv"
            className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-5 transition-colors hover:border-primary/40 hover:bg-white"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-medium tracking-tight">Choose Buildium export</div>
                <div className="text-sm text-muted-foreground">
                  Supports the property export CSV you shared. We extract the leading locator code, strata plan, and unit from each row.
                </div>
              </div>
            </div>
            <Input
              ref={inputRef}
              id="buildium-csv"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedFile ? `Selected: ${selectedFile.name}` : 'No file selected yet.'}
            </div>
            <Button
              onClick={handleImport}
              disabled={!importEnabled || isImporting || !selectedFile}
              className="min-w-40"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isImporting ? 'Importing...' : 'Import CSV'}
            </Button>
          </div>

          <div className="rounded-2xl bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
            The old importer felt broken because it wrote directly from the browser into Firestore. This uploader now imports on the server, so browser-side admin permission issues are out of the path.
          </div>

          {lastError && (
            <div className="flex items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <div>{lastError}</div>
            </div>
          )}

          {lastImportStats && (
            <div className="flex items-start gap-2 rounded-2xl bg-accent/70 px-4 py-3 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
              <div>
                Imported {lastImportStats.properties} properties and {lastImportStats.owners} owner groups.
                {' '}
                {lastImportStats.propertiesWithStrataNumber} rows have a strata number.
                {' '}
                {lastImportStats.propertiesWithoutStrataNumber > 0
                  ? `${lastImportStats.propertiesWithoutStrataNumber} rows are missing a strata number, so they were kept with owner and address only.`
                  : 'No rows were missing a strata number.'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-white/90 shadow-none">
        <CardHeader>
          <CardTitle className="tracking-tight">Imported Owners</CardTitle>
          <CardDescription>
            These records are used to decide which owner group a notice belongs to. Missing email is okay if the record is only used for matching.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Locator / Strata / Unit</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Properties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {owners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No owner records imported yet.
                  </TableCell>
                </TableRow>
              )}
              {owners.map((owner) => (
                <TableRow key={owner.id}>
                  <TableCell className="align-top">
                    <div className="font-medium">{owner.name}</div>
                    {owner.source === 'buildium' && (
                      <div className="mt-1">
                        <Badge variant="secondary">Buildium</Badge>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-wrap gap-2">
                      {(owner.locatorCodes ?? []).slice(0, 3).map((locatorCode) => (
                        <Badge key={`${owner.id}-locator-${locatorCode}`} variant="secondary">
                          {locatorCode}
                        </Badge>
                      ))}
                      {(owner.planCodes ?? []).map((planCode) => (
                        <Badge key={`${owner.id}-${planCode}`} variant="outline">
                          Strata {planCode}
                        </Badge>
                      ))}
                      {(owner.unitNumbers ?? []).slice(0, 3).map((unit) => (
                        <Badge key={`${owner.id}-unit-${unit}`} variant="outline">
                          Unit {unit}
                        </Badge>
                      ))}
                      {(owner.planCodes ?? []).length === 0 && (
                        <Badge variant="outline">Strata empty</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    {owner.email || 'No email on file'}
                  </TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground">
                    {owner.properties.slice(0, 2).join(', ')}
                    {owner.properties.length > 2 && ` +${owner.properties.length - 2} more`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
