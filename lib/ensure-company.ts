import { prisma } from './prisma';
import { DEFAULT_COMPANY_ID } from './bootstrap';

/**
 * Ensures a company exists. Creates it if missing (for known default company ID).
 * Used by WebSocket REGISTER and sync API when auto-creating devices.
 */
export async function ensureCompanyExists(companyId: string): Promise<boolean> {
  const existing = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });
  if (existing) return true;

  if (companyId === DEFAULT_COMPANY_ID) {
    await prisma.company.create({
      data: {
        id: DEFAULT_COMPANY_ID,
        name: 'Default Company (AUTO DEVICE MODE)',
      },
    });
    console.log('[EnsureCompany] Created default company:', companyId);
    return true;
  }

  return false;
}
