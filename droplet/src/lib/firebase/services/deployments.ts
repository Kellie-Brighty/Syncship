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
  doc,
  updateDoc,
  startAfter,
  getDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
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

export interface PaginatedDeployments {
  deployments: Deployment[];
  lastVisible: QueryDocumentSnapshot | null;
}

export async function getPaginatedDeployments(
  filters: { ownerId?: string; siteId?: string },
  pageSize: number,
  lastVisibleDoc: QueryDocumentSnapshot | null = null
): Promise<PaginatedDeployments> {
  let q = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  if (filters.ownerId) {
    q = query(q, where('ownerId', '==', filters.ownerId));
  }
  if (filters.siteId) {
    q = query(q, where('siteId', '==', filters.siteId));
  }
  if (lastVisibleDoc) {
    q = query(q, startAfter(lastVisibleDoc));
  }

  const snapshot = await getDocs(q);
  const deployments = snapshot.docs.map((d) => toDeployment(d.id, d.data()));
  const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

  return { deployments, lastVisible };
}

export async function getSiteDeploymentCount(siteId: string): Promise<number> {
  const q = query(
    collection(db, COLLECTION),
    where('siteId', '==', siteId)
  );
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
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

export async function cancelDeployment(deploymentId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, deploymentId), {
    status: 'canceled',
    completedAt: serverTimestamp()
  });
}
