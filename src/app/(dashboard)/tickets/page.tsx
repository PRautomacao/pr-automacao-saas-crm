'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, MoreVertical, User, Calendar, Clock, AlertCircle } from 'lucide-react';

const mockTickets = [
  { id: '001', number: 'TKT-001', title: 'Dúvida sobre exames', client: 'Maria Silva', status: 'open', priority: 'high', assignedTo: 'João', createdAt: '2024-01-15 14:30' },
  { id: '002', number: 'TKT-002', title: 'Agendamento consulta', client: 'João Santos', status: 'in_progress', priority: 'medium', assignedTo: 'Ana', createdAt: '2024-01-15 13:00' },
  { id: '003', number: 'TKT-003', title: 'Resultado de exame', client: 'Ana Oliveira', status: 'waiting', priority: 'low', assignedTo: 'Carlos', createdAt: '2024-01-15 11:45' },
  { id: '004', number: 'TKT-004', title: 'Pagamento boleto', client: 'Carlos Lima', status: 'open', priority: 'urgent', assignedTo: null, createdAt: '2024-01-15 10:20' },
  { id: '005', number: 'TKT-005', title: 'Reclamação atendimento', client: 'Paula Souza', status: 'resolved', priority: 'medium', assignedTo: 'João', createdAt: '2024-01-14 16:00' },
];

const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    open: { label: 'Aberto', color: 'text-yellow-700', bg: 'bg-yellow-100' },
    in_progress: { label: 'Em Andamento', color: 'text-blue-700', bg: 'bg-blue-100' },
    waiting: { label: 'Aguardando', color: 'text-purple-700', bg: 'bg-purple-100' },
    resolved: { label: 'Resolvido', color: 'text-green-700', bg: 'bg-green-100' },
    closed: { label: 'Fechado', color: 'text-slate-700', bg: 'bg-slate-100' },
  };
  return configs[status] || configs.open;
};

const getPriorityConfig = (priority: string) => {
  const configs: Record<string, { label: string; color: string }> = {
    urgent: { label: 'Urgente', color: 'text-red-600' },
    high: { label: 'Alta', color: 'text-orange-600' },
    medium: { label: 'Média', color: 'text-yellow-600' },
    low: { label: 'Baixa', color: 'text-slate-500' },
  };
  return configs[priority] || configs.medium;
};

export default function TicketsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Atendimentos</h1>
          <p className="text-slate-500 mt-1">Gerencie tickets e solicitações</p>
        </div>
        <Link
          href="/tickets/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Atendimento
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por título ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:border-primary outline-none"
            >
              <option value="all">Todos os Status</option>
              <option value="open">Aberto</option>
              <option value="in_progress">Em Andamento</option>
              <option value="waiting">Aguardando</option>
              <option value="resolved">Resolvido</option>
            </select>
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Filter className="w-4 h-4" />
              Mais Filtros
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Ticket</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Título</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Cliente</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Prioridade</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Responsável</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Criado em</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockTickets.map((ticket) => {
                const statusConfig = getStatusConfig(ticket.status);
                const priorityConfig = getPriorityConfig(ticket.priority);
                
                return (
                  <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-slate-900">{ticket.number}</span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">{ticket.title}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">{ticket.client}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {ticket.priority === 'urgent' && <AlertCircle className="w-4 h-4 text-red-500" />}
                        <span className={`text-sm font-medium ${priorityConfig.color}`}>
                          {priorityConfig.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-600">
                        {ticket.assignedTo || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {ticket.createdAt}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">Mostrando 1-5 de 156 tickets</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50" disabled>
              Anterior
            </button>
            <button className="px-3 py-1 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}