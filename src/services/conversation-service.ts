import { conversationRepository } from '@/repositories/conversation-repository';

export class ConversationService {
  async getActiveConversations(companyId: string) {
    if (!companyId) throw new Error('companyId é obrigatório');
    return conversationRepository.findAllActiveByCompany(companyId);
  }

  async getConversationMessages(companyId: string, conversationId: string) {
    if (!companyId || !conversationId) throw new Error('Parâmetros inválidos');
    return conversationRepository.findMessagesByConversation(conversationId, companyId);
  }

  async countActiveConversations(companyId: string) {
    if (!companyId) return 0;
    return conversationRepository.countActiveByCompany(companyId);
  }

  async sendMessage(companyId: string, conversationId: string, content: string, senderId?: string, senderName?: string) {
    if (!companyId || !conversationId || !content) {
      throw new Error('Parâmetros obrigatórios ausentes');
    }

    return conversationRepository.createMessage({
      content,
      direction: 'outgoing',
      origin: 'HUMAN',
      companyId,
      conversationId,
      senderId,
      senderName
    });
  }
}

export const conversationService = new ConversationService();
