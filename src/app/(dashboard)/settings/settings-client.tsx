'use client';

import { useState } from 'react';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Camera,
  Save,
  Shield,
  CreditCard,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { updateCompanySettings } from '@/app/actions/system-actions';

export default function SettingsClient({ initialData }: { initialData: any }) {
  const [activeTab, setActiveTab] = useState('geral');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
     name: initialData?.name || '',
     email: initialData?.email || '',
     phone: initialData?.phone || ''
  });

  const handleSave = async () => {
     setIsSaving(true);
     try {
       await updateCompanySettings(formData);
     } catch (e) {
       console.error("Erro", e);
     } finally {
       setIsSaving(false);
     }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configurações do Workspace</h1>
        <p className="text-slate-500 mt-1 text-sm">Gerencie os dados oficiais da <b>{formData.name}</b> logada no banco.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mt-6">
        
        {/* Settings Navigation Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="flex flex-col space-y-1">
            <button 
              onClick={() => setActiveTab('geral')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'geral' 
                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" /> Dados da Empresa
            </button>
            <button 
              onClick={() => setActiveTab('canais')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'canais' 
                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Canais & Integrações
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1">
          {activeTab === 'geral' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                   <h2 className="text-lg font-bold text-slate-900">Informações Institucionais</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Nome Oficial</label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                         type="text" 
                         value={formData.name} 
                         onChange={e => setFormData({...formData, name: e.target.value})}
                         className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">CNPJ / Documento</label>
                    <input disabled type="text" value={initialData?.document || ''} placeholder="Não cadastrado" className="w-full px-4 py-2.5 bg-slate-100/50 border border-slate-200 rounded-lg text-sm outline-none shadow-sm cursor-not-allowed" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">E-mail corporativo</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                         type="email" 
                         value={formData.email} 
                         onChange={e => setFormData({...formData, email: e.target.value})}
                         className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Telefone Principal</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                         type="text" 
                         value={formData.phone} 
                         onChange={e => setFormData({...formData, phone: e.target.value})}
                         className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50/50 border-t border-slate-200 flex justify-end gap-3 rounded-b-2xl">
                 <button className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm shadow-blue-200" onClick={handleSave} disabled={isSaving}>
                   {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" /> }
                   Salvar no Banco
                 </button>
              </div>
            </div>
          )}

          {activeTab === 'canais' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-6 sm:p-8 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center shadow-sm">
                        <MessageSquare className="w-5 h-5" />
                     </div>
                     <div>
                        <h2 className="text-lg font-bold text-slate-900">Integração WhatsApp API</h2>
                        <p className="text-sm text-slate-500 mt-1">Conecte o Evolution API para espelhar mensagens.</p>
                     </div>
                  </div>
               </div>
               <div className="p-6 sm:p-8 space-y-6">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                     A fundação de API conectará sua URL. No momento as variáveis JSON não estão habilitadas no teste base.
                  </div>
                  <div className="space-y-4 opacity-60 pointer-events-none">
                     <div className="space-y-2">
                       <label className="text-sm font-semibold text-slate-700">Evolution API URL</label>
                       <input type="url" disabled placeholder="https://api.evolution.suaempresa.com.br" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                     </div>
                  </div>
               </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
