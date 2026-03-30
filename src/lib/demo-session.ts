import { cookies } from 'next/headers';

export const DEMO_MODE_COOKIE = 'strata_demo_mode';

export async function isDemoModeEnabled(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(DEMO_MODE_COOKIE)?.value === '1';
}
