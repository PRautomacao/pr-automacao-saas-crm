import { customerService } from './customer-service';
import { conversationService } from './conversation-service';
import prisma from '@/lib/prisma';

export class DashboardService {
  async getDashboardStats(companyId: string) {
    if (!companyId) throw new Error('companyId é obrigatório');

    // Executa as queries paralelamente
    const [
      totalCustomers,
      activeConversations,
      openTickets
    ] = await Promise.all([
      customerService.getTotalActiveCustomers(companyId),
      conversationService.countActiveConversations(companyId),
      prisma.ticket.count({ where: { companyId, status: { notIn: ['CLOSED', 'RESOLVED'] } } })
    ]);

    // Calcular algumas métricas estáticas base para composição de % 
    // (em prod seria calculado com base em start/end do mes atual vs anterior)
    const mockResolutionRate = "94%";

    return {
      totalCustomers,
      activeConversations,
      openTickets,
      resolutionRate: mockResolutionRate
    };
  }
}

export const dashboardService = new DashboardService();
