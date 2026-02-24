import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  type DocumentData
} from 'firebase/firestore';
import { db } from '$lib/firebase/client';
import type { Site } from '$lib/types/models';

const COLLECTION = 'sites';

function toSite(id: string, data: DocumentData): Site {
  return {
    id,
    name: data.name ?? '',
    domain: data.domain ?? '',
    repo: data.repo ?? '',
    branch: data.branch ?? 'main',
    buildCommand: data.buildCommand ?? 'npm run build',
    outputDir: data.outputDir ?? 'dist',
    status: data.status ?? 'pending',
    lastDeployAt: data.lastDeployAt?.toDate() ?? null,
    ownerId: data.ownerId ?? '',
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? new Date()
  };
}

export async function getSites(ownerId: string): Promise<Site[]> {
  const q = query(
    collection(db, COLLECTION),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toSite(d.id, d.data()));
}

export async function getSiteById(id: string): Promise<Site | null> {
  const ref = doc(db, COLLECTION, id);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return toSite(snapshot.id, snapshot.data());
}

export async function createSite(
  data: Omit<Site, 'id' | 'createdAt' | 'updatedAt' | 'lastDeployAt' | 'status'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    status: 'pending',
    lastDeployAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

export async function updateSite(id: string, data: Partial<Site>): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function deleteSite(id: string): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}
