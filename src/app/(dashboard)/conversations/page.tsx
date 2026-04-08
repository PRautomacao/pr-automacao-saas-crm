import { fetchActiveConversations } from '@/app/actions/conversation-actions';
import ChatInterface from './chat-interface';

// Ensure this page works dynamically (if needed) to not cache the conversations forever
export const dynamic = 'force-dynamic';

export default async function ConversationsPage() {
  const activeChats = await fetchActiveConversations();
  
  return <ChatInterface initialChats={activeChats} />;
}
