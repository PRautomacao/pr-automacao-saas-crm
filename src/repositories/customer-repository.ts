import prisma from '@/lib/prisma';
import { Customer, Prisma } from '@prisma/client';

export class CustomerRepository {
  async findAllByCompany(companyId: string): Promise<Customer[]> {
    return prisma.customer.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countByCompany(companyId: string): Promise<number> {
    return prisma.customer.count({
      where: { companyId, isActive: true },
    });
  }

  async create(data: Prisma.CustomerUncheckedCreateInput): Promise<Customer> {
    return prisma.customer.create({
      data,
    });
  }

  async update(id: string, data: Prisma.CustomerUpdateInput): Promise<Customer> {
    return prisma.customer.update({
      where: { id },
      data,
    });
  }
}

export const customerRepository = new CustomerRepository();
