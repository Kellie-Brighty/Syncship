import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getCountFromServer,
  serverTimestamp,
  type DocumentData
} from 'firebase/firestore';
import { db } from '$lib/firebase/client';
import type { Deployment } from '$lib/types/models';

const COLLECTION = 'deployments';

function toDeployment(id: string, data: DocumentData): Deployment {
  return {
    id,
    siteId: data.siteId ?? '',
    siteName: data.siteName ?? '',
    commit: data.commit ?? '',
    message: data.message ?? '',
    branch: data.branch ?? 'main',
    status: data.status ?? 'queued',
    duration: data.duration ?? '—',
    buildLog: data.buildLog ?? '',
    triggeredBy: data.triggeredBy ?? 'webhook',
    ownerId: data.ownerId ?? '',
    createdAt: data.createdAt?.toDate() ?? new Date()
  };
}

export async function getDeployments(ownerId: string, max = 50): Promise<Deployment[]> {
  const q = query(
    collection(db, COLLECTION),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc'),
    limit(max)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toDeployment(d.id, d.data()));
}

export async function getDeploymentsBySite(siteId: string, max = 20): Promise<Deployment[]> {
  const q = query(
    collection(db, COLLECTION),
    where('siteId', '==', siteId),
    orderBy('createdAt', 'desc'),
    limit(max)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toDeployment(d.id, d.data()));
}

export async function createDeployment(
  data: Omit<Deployment, 'id' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function getTotalDeploymentCount(ownerId: string): Promise<number> {
  const q = query(
    collection(db, COLLECTION),
    where('ownerId', '==', ownerId)
  );
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}
