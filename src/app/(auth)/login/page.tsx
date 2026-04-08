'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/workspaces';
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!credentials.email || !credentials.password) {
      setError('Preencha os campos obrigatórios');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: credentials.email,
        password: credentials.password,
        callbackUrl,
      });

      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      } else {
        router.push(callbackUrl);
      }
    } catch {
      setError('Erro interno ao tentar fazer login.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Left Form Panel */}
      <div className="w-full lg:w-[45%] flex flex-col justify-between px-8 sm:px-16 md:px-24 py-12">
         {/* Simple Header */}
         <div>
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
               <span className="text-white font-extrabold tracking-tighter text-lg">PR</span>
            </div>
         </div>

         {/* Form Container */}
         <div className="w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-[32px] font-extrabold text-slate-900 tracking-tight leading-tight">Boas-vindas.</h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">Faça login com seu e-mail corporativo para acessar sua central B2B.</p>

            <form onSubmit={handleSubmit} className="mt-10 space-y-5">
               {error && (
                 <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium border border-red-100/50 flex items-center gap-2 animate-in slide-in-from-top-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div> {error}
                 </div>
               )}

               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">E-mail Corporativo</label>
                  <input
                    type="email"
                    value={credentials.email}
                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F8FAFC] border-none rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition-all text-[15px] font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal shadow-inner shadow-slate-100/50"
                    placeholder="admin@cliente.com.br"
                    required
                  />
               </div>

               <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                     <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">Senha Automática</label>
                     <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">Esqueceu?</a>
                  </div>
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F8FAFC] border-none rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition-all text-[15px] font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal shadow-inner shadow-slate-100/50 font-mono"
                    placeholder="••••••••"
                    required
                  />
               </div>

               <button
                 type="submit"
                 disabled={isLoading}
                 className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group shadow-lg shadow-slate-900/20"
               >
                 {isLoading ? (
                   <Loader2 className="w-5 h-5 animate-spin" />
                 ) : (
                   <>
                     Acessar Workspace <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                   </>
                 )}
               </button>
            </form>
         </div>

         {/* Footer Left */}
         <div className="text-xs text-slate-400 font-medium">
            © {new Date().getFullYear()} PR Automação • <a href="#" className="hover:text-slate-600 transition-colors">Privacidade</a>
         </div>
      </div>

      {/* Right Graphic Panel */}
      <div className="hidden lg:flex w-[55%] relative overflow-hidden bg-slate-900 flex-col items-center justify-center p-12">
         {/* Modern Abstract Background elements */}
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/30 via-slate-900 to-black"></div>
         <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-blue-600/20 blur-[120px]"></div>
         <div className="absolute top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[100px]"></div>
         
         <div className="relative z-10 max-w-lg text-center animate-in fade-in zoom-in-95 duration-1000 delay-150">
            {/* Visual Glassmorphism Mockup Element */}
            <div className="w-full aspect-[4/3] rounded-2xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-md p-6 flex flex-col gap-4 mb-12 transform perspective-1000 rotate-y-[-5deg] rotate-x-[5deg]">
               <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex gap-2">
                     <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
                     <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
                     <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                  </div>
                  <div className="h-2 w-24 bg-white/20 rounded-full"></div>
               </div>
               <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 animate-pulse"></div>
                  <div className="space-y-2 flex-1">
                     <div className="h-2 w-3/4 bg-white/20 rounded-full"></div>
                     <div className="h-2 w-1/2 bg-white/10 rounded-full"></div>
                  </div>
               </div>
               <div className="flex-1 mt-4 rounded-xl bg-white/5 border border-white/5 p-4 space-y-3">
                  <div className="h-8 w-full bg-white/10 rounded-lg"></div>
                  <div className="h-8 w-5/6 bg-blue-600/20 border border-blue-500/30 rounded-lg translate-x-4"></div>
                  <div className="h-8 w-full bg-white/10 rounded-lg mb-2"></div>
               </div>
            </div>

            <h2 className="text-3xl font-bold text-white tracking-tight">O motor do seu atendimento.</h2>
            <p className="text-slate-400 mt-4 text-base leading-relaxed max-w-md mx-auto">
               Unifique Whatsapp, dados do CRM e Inteligência Artificial num único painel e reduza em até 70% o gargalo operacional.
            </p>
         </div>
      </div>
      
    </div>
  );
}