import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Simple server-side load to ensure the route exists.
    // Client-side $effect handles the actual redirection to dashboard for non-admins.
    return {};
};
