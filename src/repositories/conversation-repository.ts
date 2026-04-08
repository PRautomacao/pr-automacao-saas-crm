import prisma from '@/lib/prisma';
import { Conversation, ConversationMessage, Prisma } from '@prisma/client';

export class ConversationRepository {
  async findAllActiveByCompany(companyId: string) {
    return prisma.conversation.findMany({
      where: { companyId, status: { not: 'closed' } },
      include: {
        customer: true,
        conversationMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async countActiveByCompany(companyId: string) {
    return prisma.conversation.count({
      where: { companyId, status: { not: 'closed' } },
    });
  }

  async findMessagesByConversation(conversationId: string, companyId: string) {
    return prisma.conversationMessage.findMany({
      where: { conversationId, companyId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createMessage(data: Prisma.ConversationMessageUncheckedCreateInput) {
    const message = await prisma.conversationMessage.create({ data });
    
    // Update the conversation's updatedAt and lastMessageAt
    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { 
        updatedAt: new Date(), 
        lastMessageAt: new Date(),
        status: data.direction === 'incoming' ? 'open' : undefined 
      }
    });

    return message;
  }
}

export const conversationRepository = new ConversationRepository();
