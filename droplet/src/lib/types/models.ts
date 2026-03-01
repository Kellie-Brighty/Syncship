// Firestore data models for SyncShip

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'user';
  plan: 'free' | 'lifetime' | 'pro';
  githubToken?: string;
  isWhitelisted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Site {
  id: string;
  name: string;
  domain: string;
  repo: string;
  branch: string;
  siteType: 'static' | 'backend';
  isPrivate?: boolean;
  buildCommand: string;
  outputDir: string;
  startCommand?: string;
  port?: number;
  status: 'live' | 'building' | 'failed' | 'pending';
  lastDeployAt: Date | null;
  ownerId: string;
  envVars?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deployment {
  id: string;
  siteId: string;
  siteName: string;
  commit: string;
  message: string;
  branch: string;
  status: 'success' | 'failed' | 'building' | 'queued';
  duration: string;
  buildLog?: string;
  triggeredBy: string;
  ownerId: string;
  createdAt: Date;
}

export interface ServerStats {
  id: string;
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  uptime: string;
  activeSites: number;
  totalDeployments: number;
  dropletIp?: string;
  timestamp: Date;
}
