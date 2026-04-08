'use client';

import { useState } from 'react';
import { Customer } from '@prisma/client';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  Phone, 
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  Loader2
} from 'lucide-react';
import { createCustomer } from '@/app/actions/customer-actions';

export default function CustomerList({ initialCustomers }: { initialCustomers: Customer[] }) {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

  const filteredCustomers = initialCustomers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await createCustomer({ ...formData, tags: ['Novo Cliente'] });
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', email: '' });
    } catch (error) {
       console.error("Erro ao criar:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 h-full flex flex-col">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clientes & Leads</h1>
          <p className="text-slate-500 mt-1 text-sm">Gerencie a base real de contatos do seu banco de dados.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors border border-transparent shadow-sm shadow-blue-200"
          >
            <Plus className="w-4 h-4" /> Novo Contato
          </button>
        </div>
      </div>

      {/* Table & Filters Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
        
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-96 group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar cliente na base atual..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
              <Filter className="w-4 h-4" /> Filtros
            </button>
          </div>
        </div>

        {/* Desktop Table Layout */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Cliente / Empresa</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Contato Principal</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Etiquetas (Tags)</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">Nenhum cliente encontrado na base.</td>
                </tr>
              ) : filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200 shadow-sm uppercase">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{customer.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 max-w-[200px] truncate">{customer.email || 'Sem e-mail'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700 flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400"/> {customer.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      customer.isActive 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {customer.isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></div>}
                      {customer.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                       {customer.tags.map(tag => (
                          <span key={tag} className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md text-xs font-medium">
                            {tag}
                          </span>
                       ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="p-4 border-t border-slate-200 bg-white mt-auto flex items-center justify-between text-sm text-slate-500 font-medium">
          <p>Mostrando {filteredCustomers.length} de {initialCustomers.length} resultados reais</p>
          <div className="flex items-center gap-2">
             <button className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-400">
                <ChevronLeft className="w-4 h-4" />
             </button>
             <button className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600">
                <ChevronRight className="w-4 h-4" />
             </button>
          </div>
        </div>

      </div>

      {/* Criar Contato Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Novo Contato B2B</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
             </div>
             <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1">Nome Completo / Empresa *</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1">Telefone Principal (WhatsApp) *</label>
                  <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1">E-mail (opcional)</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
                </div>
                
                <div className="pt-4 flex justify-end gap-3">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50">Cancelar</button>
                   <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 flex items-center gap-2">
                     {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Salvar no Banco'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
