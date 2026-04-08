'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { conversationService } from '@/services/conversation-service';
import { revalidatePath } from 'next/cache';

async function getSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    throw new Error('Não autorizado');
  }
  return session;
}

export async function fetchActiveConversations() {
  const session = await getSession();
  return conversationService.getActiveConversations(session.user.companyId);
}

export async function fetchConversationMessages(conversationId: string) {
  const session = await getSession();
  return conversationService.getConversationMessages(session.user.companyId, conversationId);
}

export async function sendChatMessage(conversationId: string, content: string) {
  const session = await getSession();
  const userId = session.user.id;
  const userName = session.user.name || undefined;

  const msg = await conversationService.sendMessage(
    session.user.companyId,
    conversationId,
    content,
    userId,
    userName
  );

  // Aqui no futuro poderia disparar Axios para o Evolution API enviando para o Whatsapp real. 
  revalidatePath('/conversations');
  return msg;
}
