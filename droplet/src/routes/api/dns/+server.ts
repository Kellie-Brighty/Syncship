import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ url }: RequestEvent) {
  const domain = url.searchParams.get('domain');

  if (!domain) {
    return json({ error: 'Domain is required' }, { status: 400 });
  }

  // Remove protocol and trailing slashes if accidentally included
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  try {
    // Use Google Public DNS API for consistent results across all environments
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=A`);
    if (!res.ok) throw new Error('DNS lookup failed');

    const data = await res.json();

    // Extract A records from the response
    const records = (data.Answer || [])
      .filter((r: { type: number }) => r.type === 1) // type 1 = A record
      .map((r: { data: string }) => r.data);

    return json({ records, domain: cleanDomain });
  } catch (error: any) {
    return json({ records: [], domain: cleanDomain, error: error.message });
  }
}
