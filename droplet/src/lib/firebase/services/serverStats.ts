import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  type DocumentData
} from 'firebase/firestore';
import { db } from '$lib/firebase/client';
import type { ServerStats } from '$lib/types/models';

const COLLECTION = 'serverStats';

function toServerStats(id: string, data: DocumentData): ServerStats {
  return {
    id,
    cpuUsage: data.cpu ?? data.cpuUsage ?? 0,
    ramUsage: data.memory ?? data.ramUsage ?? 0,
    diskUsage: data.diskUsage ?? 0,
    uptime: data.uptime ?? '0d 0h',
    activeSites: data.activeSites ?? 0,
    totalDeployments: data.totalDeployments ?? 0,
    timestamp: data.timestamp?.toDate() ?? new Date()
  };
}

export async function getServerStats(serverId: string = 'default'): Promise<ServerStats | null> {
  const ref = doc(db, COLLECTION, serverId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return toServerStats(snapshot.id, snapshot.data());
}

export async function updateServerStats(
  serverId: string = 'default',
  data: Partial<Omit<ServerStats, 'id' | 'timestamp'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, serverId);
  await setDoc(ref, {
    ...data,
    timestamp: serverTimestamp()
  }, { merge: true });
}

export function listenToServerStats(
  callback: (stats: ServerStats | null) => void,
  serverId: string = 'live'
) {
  const ref = doc(db, COLLECTION, serverId);
  return onSnapshot(ref, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback(toServerStats(snapshot.id, snapshot.data()));
  }, (error) => {
    console.error(`Error listening to server stats ${serverId}:`, error);
  });
}
