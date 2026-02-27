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
    siteType: data.siteType ?? 'static',
    buildCommand: data.buildCommand ?? '',
    outputDir: data.outputDir ?? '.',
    startCommand: data.startCommand,
    port: data.port,
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

import { canCreateSite } from './payments';

export async function createSite(
  data: Omit<Site, 'id' | 'createdAt' | 'updatedAt' | 'lastDeployAt' | 'status'>
): Promise<string> {
  const sites = await getSites(data.ownerId);
  const { allowed, message } = await canCreateSite(data.ownerId, sites.length);
  
  if (!allowed) {
    throw new Error(message || 'Site limit reached');
  }

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
  // Firestore rejects `undefined` values — strip them out before updating
  const clean = Object.fromEntries(
    Object.entries({ ...data, updatedAt: serverTimestamp() }).filter(([, v]) => v !== undefined)
  );
  await updateDoc(ref, clean);
}

export async function deleteSite(id: string): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}
