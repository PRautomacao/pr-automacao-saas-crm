'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dashboardService } from '@/services/dashboard-service';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

async function getSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    throw new Error('Não autorizado');
  }
  return session;
}

export async function fetchDashboardStats() {
  const session = await getSession();
  return dashboardService.getDashboardStats(session.user.companyId);
}

// Company Settings 
export async function fetchCompanySettings() {
  const session = await getSession();
  return prisma.company.findUnique({
    where: { id: session.user.companyId }
  });
}

export async function updateCompanySettings(data: { name?: string, email?: string, phone?: string }) {
  const session = await getSession();
  await prisma.company.update({
    where: { id: session.user.companyId },
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
    }
  });

  revalidatePath('/settings');
}
