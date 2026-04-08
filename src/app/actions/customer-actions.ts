'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { customerService } from '@/services/customer-service';
import { revalidatePath } from 'next/cache';

async function getSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    throw new Error('Não autorizado (CompanyID faltando)');
  }
  return session;
}

export async function fetchCustomers() {
  const session = await getSession();
  const customers = await customerService.getCustomersForCompany(session.user.companyId);
  return customers;
}

export async function createCustomer(data: { name: string, phone: string, email?: string, tags?: string[] }) {
  const session = await getSession();
  const newCustomer = await customerService.createCustomer(session.user.companyId, data);
  
  // Força atualização da página para refletir no Client
  revalidatePath('/customers');
  return newCustomer;
}
