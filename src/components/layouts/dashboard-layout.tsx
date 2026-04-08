'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  LayoutDashboard, 
  Users, 
  Ticket, 
  ShoppingCart, 
  Settings, 
  LogOut,
  Building2,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Bell,
  Search,
  CheckCircle2,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navigation = [
  { name: 'Visão Geral', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Mensagens / Central', href: '/conversations', icon: MessageSquare, badge: '3' },
  { name: 'Clientes & Leads', href: '/customers', icon: Users },
  { name: 'Atendimentos', href: '/tickets', icon: Ticket },
  { name: 'Catálogo / Serviços', href: '/services', icon: Package },
];

const settingsNav = [
  { name: 'Minha Empresa', href: '/settings', icon: Building2 },
  { name: 'Time e Usuários', href: '/users', icon: Users },
  { name: 'Configurações Avançadas', href: '/settings/advanced', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar - Premium Light Theme */}
      <aside className="w-[260px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col fixed h-full z-40">
        
        {/* Workspace Selector (SaaS style) */}
        <div className="h-16 flex items-center px-4 border-b border-slate-100 relative cursor-pointer hover:bg-slate-50 transition-colors"
             onClick={() => setWorkspaceOpen(!workspaceOpen)}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-sm shadow-blue-200">
            <span className="text-white font-bold text-sm tracking-tighter">PR</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <h2 className="text-sm font-semibold text-slate-900 truncate">
              {session?.user?.companyName || 'Carregando...'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">Plano Premium</p>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400" />

          {/* Fake Dropdown for Visual Effect */}
          {workspaceOpen && (
            <div className="absolute top-16 left-4 right-4 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50">
               <div className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900">{session?.user?.companyName}</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
               </div>
               <div className="h-px bg-slate-100 my-1"></div>
               <div className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Criar Workspace
                  </span>
               </div>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto pt-6 px-4 pb-4 select-none scrollbar-thin scrollbar-thumb-slate-200">
          <p className="text-xs font-bold text-slate-400 mb-3 px-2 tracking-wider uppercase">Menu Principal</p>
          <nav className="space-y-1 mb-8">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={cn("w-[18px] h-[18px]", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                    {item.name}
                  </div>
                  {item.badge && (
                     <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                       {item.badge}
                     </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <p className="text-xs font-bold text-slate-400 mb-3 px-2 tracking-wider uppercase">Administração</p>
          <nav className="space-y-1">
            {settingsNav.map((item) => {
              const isActive = pathname.startsWith(item.href) && item.href !== '/dashboard'; // simple highlight logical check
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <item.icon className={cn("w-[18px] h-[18px]", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center justify-between hover:bg-slate-50 p-2 rounded-xl cursor-pointer transition-colors" onClick={() => handleLogout()}>
             <div className="flex items-center gap-3">
               <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm ring-2 ring-white">
                 {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
               </div>
               <div className="flex flex-col">
                 <span className="text-sm font-semibold text-slate-900 leading-tight">
                   {session?.user?.name?.split(' ')[0] || 'Carregando...'}
                 </span>
                 <span className="text-[11px] text-slate-500 font-medium">Sair da conta</span>
               </div>
             </div>
             <LogOut className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 pl-[260px] flex flex-col min-h-screen max-w-[100vw]">
        {/* Sticky Global Top Header */}
        <header className="h-16 bg-white/70 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
             <span className="capitalize">{pathname.split('/')[1]?.replace('-', ' ') || 'Dashboard'}</span>
             {pathname.split('/').length > 2 && (
               <>
                 <ChevronRight className="w-4 h-4 text-slate-300" />
                 <span className="text-slate-900 capitalize">{pathname.split('/')[2]?.replace('-', ' ')}</span>
               </>
             )}
          </div>

          <div className="flex items-center gap-5">
            {/* Global Search Mock */}
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Busca global (Ctrl+K)" 
                className="pl-9 pr-4 py-1.5 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none rounded-lg text-sm w-64 transition-all duration-300"
              />
            </div>
            
            <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}