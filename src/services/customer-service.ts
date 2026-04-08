import { customerRepository } from '@/repositories/customer-repository';
import { Customer } from '@prisma/client';

export class CustomerService {
  async getCustomersForCompany(companyId: string) {
    if (!companyId) throw new Error('companyId é obrigatório');
    return customerRepository.findAllByCompany(companyId);
  }

  async getTotalActiveCustomers(companyId: string) {
    if (!companyId) return 0;
    return customerRepository.countByCompany(companyId);
  }

  async createCustomer(companyId: string, data: { name: string, phone: string, email?: string, tags?: string[] }) {
    if (!companyId || !data.name || !data.phone) {
      throw new Error('Nome e telefone são obrigatórios');
    }

    // Validação básica simplificada para o Service
    return customerRepository.create({
      ...data,
      companyId,
    });
  }
}

export const customerService = new CustomerService();
