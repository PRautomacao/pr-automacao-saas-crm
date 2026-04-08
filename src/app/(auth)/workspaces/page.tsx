'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronRight, Plus, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

const mockWorkspaces = [
  { id: '1', name: 'PR Automação', role: 'Proprietário', plan: 'Admin Master', icon: 'PR', bg: 'bg-slate-900', text: 'text-white' },
  { id: '2', name: 'Bio Análise Lab', role: 'Suporte TI', plan: 'Premium', icon: 'BA', bg: 'bg-blue-600', text: 'text-white' },
  { id: '3', name: 'Clínica VidaSaúde', role: 'Gestor', plan: 'Standard', icon: 'CV', bg: 'bg-emerald-600', text: 'text-white' },
  { id: '4', name: 'Restaurante Sabor', role: 'Suporte TI', plan: 'Basic', icon: 'RS', bg: 'bg-orange-500', text: 'text-white' }
];

export default function WorkspacesSelectionPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleSelectWorkspace = (id: string) => {
    // Aqui no futuro faremos um refresh na session hidratando o novo companyId selecionado.
    // Por enquanto, direcionamos ao painel visual.
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] flex flex-col pt-12 px-4 sm:px-6 lg:px-8">
      
      {/* Top Bar */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between mb-16">
         <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center">
                 <span className="text-white font-bold text-lg tracking-tighter">PR</span>
             </div>
             <span className="font-extrabold text-xl text-slate-900 tracking-tight">CRM B2B</span>
         </div>
         <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
            Sair da Conta <LogOut className="w-4 h-4" />
         </button>
      </div>

      <div className="max-w-6xl w-full mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
         
         <div className="mb-12">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Bem-vindo de volta, {session?.user?.name?.split(' ')[0] || 'Gestor'}!</h1>
            <p className="text-lg text-slate-500 mt-2 font-medium">Selecione o painel do cliente que deseja administrar agora.</p>
         </div>

         {/* Workspaces Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            
            {/* Loop through permitted workspaces */}
            {mockWorkspaces.map((workspace) => (
               <div 
                  key={workspace.id}
                  onClick={() => handleSelectWorkspace(workspace.id)} 
                  className="group bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between min-h-[220px]"
               >
                  <div className="flex items-start justify-between">
                     <div className={`w-14 h-14 ${workspace.bg} ${workspace.text} rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner`}>
                        {workspace.icon}
                     </div>
                     <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                         workspace.plan.includes('Master') || workspace.plan.includes('Premium') 
                         ? 'bg-amber-50 text-amber-700 border-amber-200'
                         : 'bg-slate-50 text-slate-600 border-slate-200'
                     }`}>
                        {workspace.plan}
                     </span>
                  </div>

                  <div className="mt-8">
                     <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">{workspace.name}</h3>
                     <p className="max-w-xs text-sm text-slate-500 font-medium mt-1 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Acesso: {workspace.role}</p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                     <span className="text-sm font-semibold text-slate-400 group-hover:text-blue-600 transition-colors">Acessar Painel</span>
                     <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                     </div>
                  </div>
               </div>
            ))}

            {/* Create New Workspace Action */}
            <div className="group border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center text-center p-6 hover:bg-slate-50 hover:border-blue-400 cursor-pointer min-h-[220px] transition-all">
               <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  <Plus className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
               </div>
               <h3 className="text-slate-700 font-bold group-hover:text-blue-700 transition-colors">Adicionar Cliente</h3>
               <p className="text-sm text-slate-400 font-medium max-w-[200px] mt-1">Implantar um novo hub de atendimento.</p>
            </div>

         </div>
      </div>
      
      {/* Footer */}
      <div className="mt-auto py-8 text-center">
         <p className="text-sm text-slate-400 font-medium drop-shadow-sm">Motor Tecnológico Oficializado • PR Automação © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
