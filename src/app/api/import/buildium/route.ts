import Papa from 'papaparse';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { type DocumentData, type QueryDocumentSnapshot, type WriteBatch } from 'firebase-admin/firestore';

import { buildBuildiumImportPayload } from '@/lib/buildium-import';
import { getAdminSession } from '@/lib/admin-session';
import { getAdminFirestore, hasFirebaseAdminConfig } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUILDIUM_SOURCE = 'buildium';
const BATCH_LIMIT = 400;

async function commitInChunks<T>(
  items: T[],
  applyWrite: (batch: WriteBatch, item: T) => void
) {
  const firestore = getAdminFirestore();

  for (let index = 0; index < items.length; index += BATCH_LIMIT) {
    const batch = firestore.batch();
    const chunk = items.slice(index, index + BATCH_LIMIT);
    chunk.forEach((item) => applyWrite(batch, item));
    await batch.commit();
  }
}

async function deleteExistingBuildiumDocs(collectionName: 'owners' | 'properties') {
  const snapshot = await getAdminFirestore()
    .collection(collectionName)
    .where('source', '==', BUILDIUM_SOURCE)
    .get();

  await commitInChunks<QueryDocumentSnapshot<DocumentData>>(snapshot.docs, (batch, documentSnapshot) => {
    batch.delete(documentSnapshot.ref);
  });
}

export async function POST(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: 'Admin login required.' }, { status: 401 });
  }

  if (!hasFirebaseAdminConfig()) {
    return NextResponse.json(
      { error: 'Missing Firebase admin credentials. Buildium import requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.' },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Please attach a CSV file.' }, { status: 400 });
  }

  const csvText = await file.text();
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
    transform: (value) => value.trim(),
  });

  if (parsed.errors.length > 0) {
    return NextResponse.json(
      { error: `CSV parsing error: ${parsed.errors[0].message}` },
      { status: 400 }
    );
  }

  try {
    const { owners, properties, stats } = buildBuildiumImportPayload(parsed.data as unknown[]);
    const firestore = getAdminFirestore();

    await deleteExistingBuildiumDocs('owners');
    await deleteExistingBuildiumDocs('properties');

    await commitInChunks(properties, (batch, propertyRecord) => {
      batch.set(firestore.collection('properties').doc(propertyRecord.docId), propertyRecord.data);
    });

    await commitInChunks(owners, (batch, ownerRecord) => {
      batch.set(firestore.collection('owners').doc(ownerRecord.docId), ownerRecord.data);
    });

    revalidatePath('/owners');
    revalidatePath('/properties');
    revalidatePath('/inbox');

    return NextResponse.json({ ok: true, stats });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to import Buildium CSV.' },
      { status: 400 }
    );
  }
}
