import { json } from '@sveltejs/kit';
import dns from 'dns';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ url }: RequestEvent) {
  const domain = url.searchParams.get('domain');

  if (!domain) {
    return json({ error: 'Domain is required' }, { status: 400 });
  }

  // Remove protocol and trailing slashes if accidentally included
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  try {
    const records = await dns.promises.resolve4(cleanDomain);
    return json({ records, domain: cleanDomain });
  } catch (error: any) {
    // If ENOTFOUND or no records, we just return empty array instead of 500 error
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      return json({ records: [], domain: cleanDomain });
    }
    return json({ error: error.message }, { status: 500 });
  }
}
