'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, MoreVertical, Package, Clock, DollarSign } from 'lucide-react';

const mockServices = [
  { id: '1', name: 'Hemograma Completo', category: 'Exames', type: 'service', price: 35.00, isActive: true },
  { id: '2', name: 'Glicemia', category: 'Exames', type: 'service', price: 15.00, isActive: true },
  { id: '3', name: 'Coleta em Domicílio', category: 'Serviços', type: 'service', price: 25.00, isActive: true },
  { id: '4', name: 'Kit Inverno', category: 'Produtos', type: 'product', price: 89.90, isActive: true },
  { id: '5', name: ' TSH', category: 'Exames', type: 'service', price: 45.00, isActive: false },
];

export default function ServicesPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Serviços e Produtos</h1>
          <p className="text-slate-500 mt-1">Cadastre e gerencie itens da empresa</p>
        </div>
        <Link
          href="/services/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Item
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{mockServices.length}</p>
              <p className="text-sm text-slate-500">Total de Itens</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">R$ 209,90</p>
              <p className="text-sm text-slate-500">Valor Médio</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">3</p>
              <p className="text-sm text-slate-500">Categorias</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">4</p>
              <p className="text-sm text-slate-500">Ativos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:border-primary outline-none"
            >
              <option value="all">Todos os Tipos</option>
              <option value="service">Serviços</option>
              <option value="product">Produtos</option>
            </select>
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Filter className="w-4 h-4" />
              Filtros
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Item</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Categoria</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Tipo</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Preço</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockServices.map((service) => (
                <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-medium text-slate-900">{service.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-slate-600">{service.category}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      service.type === 'service' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {service.type === 'service' ? 'Serviço' : 'Produto'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-medium text-slate-900">
                      R$ {service.price.toFixed(2).replace('.', ',')}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      service.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {service.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/services/${service.id}`}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">Mostrando 1-5 de 45 itens</p>
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