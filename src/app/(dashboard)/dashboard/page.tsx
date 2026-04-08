import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchDashboardStats } from '@/app/actions/system-actions';
import { 
  Users, 
  Ticket, 
  MessageSquare, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2 tracking-tight group-hover:text-blue-600 transition-colors">{value}</p>
        </div>
        <div className="w-12 h-12 bg-blue-50/50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors">
          <Icon className="w-6 h-6 text-blue-600 drop-shadow-sm" />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-4">
        {trend && trendValue && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${
            trend === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}>
             {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
             {trendValue}
          </div>
        )}
        {subtitle && <p className="text-sm text-slate-400 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  // Real Database Fetch via Prisma (Server Side)
  const dashboardData = await fetchDashboardStats();

  const stats = [
    { title: 'Base de Contatos', value: dashboardData.totalCustomers, subtitle: 'Total cadastrados na base', icon: Users, trend: 'up' as const, trendValue: '+15%' },
    { title: 'Atendimentos', value: dashboardData.openTickets, subtitle: 'Aguardando Operador', icon: Ticket, trend: 'neutral' as const, trendValue: 'Atualizado' },
    { title: 'Conversas WhatsApp', value: dashboardData.activeConversations, subtitle: 'Sessões vivas no canal', icon: MessageSquare, trend: 'up' as const, trendValue: '+8%' },
    { title: 'Taxa de Resolução', value: dashboardData.resolutionRate, subtitle: 'Comportamento estimado', icon: CheckCircle, trend: 'up' as const, trendValue: '+3%' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Header Welcome */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Painel de Controle</h1>
          <p className="text-slate-500 mt-2 text-sm max-w-2xl">
            Acompanhe a saúde da operação da <b>{session?.user?.companyName || 'sua empresa'}</b> em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm">
          <Clock className="w-5 h-5 text-blue-500" />
          <div className="flex flex-col">
             <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Período Atual</span>
             <span className="text-sm font-bold text-slate-700">Hoje, {new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Visual Mock Sections (Charts & Activity) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Placeholder Gráfico */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
             <div>
               <h2 className="text-lg font-bold text-slate-900">Volume de Atendimentos</h2>
               <p className="text-sm text-slate-500">Fluxo de mensagens nos últimos 7 dias</p>
             </div>
             <button className="text-sm text-blue-600 font-semibold flex items-center gap-1 hover:text-blue-700">
                Relatório Completo <ArrowUpRight className="w-4 h-4" />
             </button>
          </div>
          <div className="h-[300px] w-full bg-slate-50 rounded-xl border border-slate-100 border-dashed flex items-center justify-center">
             <div className="text-center">
               <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
               <p className="text-slate-400 font-medium">Gráfico analítico (Recharts) será renderizado aqui</p>
             </div>
          </div>
        </div>

        {/* Live Feed Lateral */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Atividade Recente</h2>
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-slate-500">LIVE</span>
            </div>
          </div>
          
          <div className="flex-1 space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200">
                   <MessageSquare className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                   <p className="text-sm font-medium text-slate-900">Novo inbound detectado no WhatsApp</p>
                   <p className="text-xs text-slate-500 mt-0.5">Sistema Online</p>
                   <p className="text-xs text-slate-400 mt-1">Há {i * 2} minutos</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl text-sm transition-colors border border-slate-200">
             Central de Eventos
          </button>
        </div>

      </div>
    </div>
  );
}