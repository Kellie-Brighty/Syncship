import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { adminAuth, adminDb } from '$lib/server/firebase-admin';

export async function GET({ request }: RequestEvent) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
             return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        
        if (!userDoc.exists) {
            return json({ error: 'User not found' }, { status: 404 });
        }

        const githubToken = userDoc.data()?.githubToken;

        if (!githubToken) {
            return json({ error: 'GitHub Token required for fetching repositories' }, { status: 400 });
        }

        const url = new URL('https://api.github.com/user/repos');
        // Sort by updated time, show 100 per page to catch the vast majority
        url.searchParams.set('sort', 'updated');
        url.searchParams.set('per_page', '100');

        const res = await fetch(url.toString(), {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'SyncShip-Detector',
                'Authorization': `token ${githubToken}`
            }
        });

        if (!res.ok) {
            // Handle case where PAT might be invalid or expired
            if (res.status === 401) {
                return json({ error: 'GitHub Token is invalid or expired.' }, { status: 401 });
            }
            throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
        }

        const repos = await res.json();
        
        // Return a simplified array for the UI
        const simplifiedRepos = repos.map((repo: any) => ({
             id: repo.id,
             name: repo.full_name, // e.g., 'owner/repo'
             private: repo.private,
             updatedAt: repo.updated_at
        }));

        return json(simplifiedRepos);

    } catch (err: any) {
        console.error('GitHub API route error (repos):', err);
        return json({ error: 'Failed to fetch repositories' }, { status: 500 });
    }
}
