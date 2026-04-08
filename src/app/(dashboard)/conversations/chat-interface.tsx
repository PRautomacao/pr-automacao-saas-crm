'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Paperclip, 
  Smile, 
  Send, 
  Phone, 
  Video, 
  Info,
  Check,
  CheckCheck,
  MessageSquare,
  Tag,
  User,
  Loader2
} from 'lucide-react';
import { sendChatMessage, fetchConversationMessages } from '@/app/actions/conversation-actions';

// We import any to bypass strictly typed prisma relational structures on client view for simplicity, 
// normally we'd define the exact extended Type.
export default function ChatInterface({ initialChats }: { initialChats: any[] }) {
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChats.length > 0 ? initialChats[0].id : null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const activeChatData = initialChats.find(c => c.id === activeChatId);

  // Load actual messages when the chat changes
  useEffect(() => {
    if (!activeChatId) return;
    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const msgs = await fetchConversationMessages(activeChatId);
        setMessages(msgs);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    loadMessages();
  }, [activeChatId]);

  const handleSendMessage = async () => {
    if (!message.trim() || !activeChatId) return;
    
    setIsSending(true);
    try {
      const sentMsg = await sendChatMessage(activeChatId, message);
      setMessages([...messages, sentMsg]);
      setMessage('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] w-full bg-white rounded-2xl border border-slate-200 shadow-sm flex overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      
      {/* LEFT PANEL - WhatsApp Web Style Chat List */}
      <div className="w-[320px] flex-shrink-0 border-r border-slate-200 flex flex-col bg-slate-50/30">
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200">
           <h2 className="font-bold text-slate-800 text-lg">Conversas</h2>
           <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-semibold text-emerald-600">Online</span>
           </div>
        </div>

        <div className="p-3 border-b border-slate-200">
          <div className="relative mb-3">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input type="text" placeholder="Buscar conversa..." className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 border-transparent rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {initialChats.length === 0 && (
             <div className="p-6 text-center text-slate-500 text-sm">
                Nenhuma conversa ativa no momento.
             </div>
          )}
          {initialChats.map((chat) => (
             <div 
               key={chat.id} 
               onClick={() => setActiveChatId(chat.id)}
               className={`flex gap-3 px-4 py-3 cursor-pointer border-l-4 transition-colors ${
                 activeChatId === chat.id 
                 ? 'bg-blue-50/50 border-blue-600' 
                 : 'bg-transparent border-transparent hover:bg-slate-50'
               }`}
             >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 flex-shrink-0 shadow-sm border border-white uppercase">
                    {chat.contactName?.charAt(0) || 'U'}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                     <p className="font-bold text-slate-900 text-sm truncate">{chat.contactName || chat.contactPhone}</p>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                     <p className="text-sm text-slate-500 truncate">
                        {chat.conversationMessages?.[0]?.content.substring(0, 30) || 'Clique para visualizar'}
                     </p>
                  </div>
                </div>
             </div>
          ))}
        </div>
      </div>

      {/* MIDDLE PANEL - Active Conversation */}
      {activeChatId ? (
         <div className="flex-1 flex flex-col min-w-[400px] bg-[#EFEAE2]">
          
          <div className="h-16 bg-white px-6 flex items-center justify-between border-b border-slate-200 shadow-sm z-10 w-full relative">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 hidden sm:flex uppercase">
                   {activeChatData?.contactName?.charAt(0) || 'C'}
                </div>
                <div className="flex flex-col">
                   <span className="font-bold text-slate-900 leading-tight">{activeChatData?.contactName || activeChatData?.contactPhone}</span>
                   <span className="text-xs text-slate-500">Aberto via WhatsApp</span>
                </div>
             </div>
             <div className="flex items-center gap-4">
                <button className="text-slate-400 hover:text-blue-600 transition-colors hidden sm:block"><Phone className="w-5 h-5" /></button>
                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                <button className="flex items-center gap-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-rose-100 transition-all">
                  Encerrar Ticket
                </button>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ backgroundImage: "url('https://static.whatsapp.net/rsrc.php/v3/yl/r/r_QxIsuT8uV.png')", backgroundBlendMode: "overlay", backgroundColor: "rgba(239, 234, 226, 0.9)" }}>
             {isLoadingMessages ? (
                <div className="flex justify-center my-10">
                   <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
             ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.direction === 'incoming' ? 'justify-start' : 'justify-end'}`}>
                     <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 pb-2 shadow-sm relative ${
                       msg.direction === 'incoming' 
                       ? 'bg-white rounded-tl-none border border-slate-100' 
                       : 'bg-[#D9FDD3] rounded-tr-none border border-green-200/50'
                     }`}>
                        {msg.direction === 'incoming' && msg.origin === 'HUMAN' && (
                           <div className="absolute -top-2.5 -left-2 bg-blue-500 text-white rounded-full p-1 shadow-sm border border-white" title="Mensagem recebida via WhatsApp">
                             <MessageSquare className="w-3 h-3" />
                           </div>
                        )}
                        <p className="text-[15px] text-slate-800 leading-snug break-words">{msg.content}</p>
                        <div className={`flex items-center gap-1 justify-end mt-1 ${msg.direction === 'incoming' ? 'text-slate-400' : 'text-green-700'}`}>
                           {msg.direction === 'outgoing' && <CheckCheck className="w-[14px] h-[14px] text-blue-500" />}
                        </div>
                     </div>
                  </div>
                ))
             )}
          </div>

          <div className="min-h-[70px] bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-end gap-3 z-10 w-full relative">
             <div className="flex-1 bg-white border border-slate-300 rounded-xl shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all flex items-center">
               <textarea 
                 value={message}
                 onChange={(e) => setMessage(e.target.value)}
                 onKeyDown={(e) => {
                    if(e.key === 'Enter' && !e.shiftKey) { 
                       e.preventDefault(); 
                       handleSendMessage(); 
                    }
                 }}
                 placeholder="Digite uma mensagem e aperte Enter para enviar ao BD..."
                 className="w-full max-h-32 bg-transparent outline-none py-3 px-4 resize-none text-[15px] placeholder:text-slate-400 scrollbar-thin overflow-y-auto"
                 rows={1}
               />
             </div>

             <button 
                onClick={handleSendMessage}
                disabled={isSending || !message.trim()}
                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 shadow-sm flex-shrink-0 transition-transform active:scale-95"
             >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
             </button>
          </div>
         </div>
      ) : (
         <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-4">
               <MessageSquare className="w-8 h-8 text-blue-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">PR WhatsApp Hub</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm text-center">Selecione uma conversa na lateral para começar a enviar mensagens conectadas ao seu banco de dados.</p>
         </div>
      )}

      {/* RIGHT PANEL - Context & Integration Data */}
      {activeChatId && (
         <div className="w-[300px] flex-shrink-0 border-l border-slate-200 bg-white hidden lg:flex flex-col overflow-y-auto">
           <div className="h-16 px-6 flex items-center border-b border-slate-200 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800">Dados do Contato</h3>
           </div>
           <div className="p-6">
              <div className="flex flex-col items-center justify-center mb-6">
                 <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center font-bold text-3xl text-blue-700 shadow-inner border border-white mb-4 uppercase">
                    {activeChatData?.contactName?.charAt(0) || 'C'}
                 </div>
                 <h4 className="text-lg font-bold text-slate-900">{activeChatData?.contactName || activeChatData?.contactPhone}</h4>
                 <p className="text-sm text-slate-500 font-medium">{activeChatData?.contactPhone}</p>
              </div>

              <div className="space-y-4">
                 <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 rounded-l-xl"></div>
                    <p className="text-[11px] font-bold text-amber-600/80 uppercase tracking-wider mb-2 flex items-center gap-2"><Info className="w-3 h-3"/> Sobre</p>
                    <p className="text-sm text-amber-900 font-medium leading-relaxed">
                       O módulo já grava o hitórico de envio diretamente no banco de dados isolado da empresa!
                    </p>
                 </div>
              </div>
           </div>
         </div>
      )}
    </div>
  );
}
