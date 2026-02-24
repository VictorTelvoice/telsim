
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Code, 
  Lock, 
  Zap, 
  Globe, 
  Copy, 
  Check,
  Terminal,
  Cpu,
  Webhook,
  ShieldCheck
} from 'lucide-react';

const ApiDocs: React.FC = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const CodeBlock = ({ code, language, id }: { code: string, language: string, id: string }) => (
    <div className="relative group mt-4">
      <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => copyToClipboard(code, id)}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-md transition-all"
        >
          {copied === id ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4 text-slate-400" />}
        </button>
      </div>
      <div className="bg-[#0f172a] rounded-2xl p-6 overflow-x-auto border border-white/5 shadow-2xl">
        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
          <div className="size-2 rounded-full bg-red-500/50"></div>
          <div className="size-2 rounded-full bg-amber-500/50"></div>
          <div className="size-2 rounded-full bg-emerald-500/50"></div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">{language}</span>
        </div>
        <pre className="text-sm font-mono leading-relaxed">
          <code className="text-slate-300">{code}</code>
        </pre>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-background-dark font-display text-slate-900 dark:text-white pb-32">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-6 py-6 border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Code className="size-4 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight">API Documentation</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-16">
        {/* Intro */}
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
            <Zap className="size-3 text-primary" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">v1.0 Stable</span>
          </div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Integra TELSIM en tus flujos de trabajo
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Nuestra API te permite gestionar números SIM físicos, recibir SMS en tiempo real y configurar webhooks para automatizar cualquier proceso de verificación.
          </p>
        </section>

        {/* Auth */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
              <Lock className="size-5" />
            </div>
            <h3 className="text-2xl font-black tracking-tight">Autenticación</h3>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">
            Todas las solicitudes deben incluir tu API Key en el encabezado <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-primary font-bold">X-TELSIM-KEY</code>. Puedes generar tus llaves desde el panel de ajustes.
          </p>
          <CodeBlock 
            id="auth-example"
            language="bash"
            code={`curl -X GET "https://api.telsim.io/v1/numbers" \\
  -H "X-TELSIM-KEY: your_api_key_here"`}
          />
        </section>

        {/* Endpoints */}
        <section className="space-y-10">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
              <Globe className="size-5" />
            </div>
            <h3 className="text-2xl font-black tracking-tight">Endpoints Principales</h3>
          </div>

          <div className="space-y-12">
            {/* List Numbers */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-md uppercase">GET</span>
                <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">/v1/numbers</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                Retorna una lista de todos tus números activos y su estado actual.
              </p>
              <CodeBlock 
                id="get-numbers"
                language="json"
                code={`{
  "status": "success",
  "data": [
    {
      "id": "sim_827364",
      "number": "+56930007777",
      "region": "Chile",
      "status": "active",
      "expires_at": "2026-03-22T19:00:00Z"
    }
  ]
}`}
              />
            </div>

            {/* Get SMS */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-md uppercase">GET</span>
                <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">/v1/messages/:number_id</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                Obtén los últimos mensajes recibidos en un número específico.
              </p>
              <CodeBlock 
                id="get-messages"
                language="json"
                code={`{
  "status": "success",
  "messages": [
    {
      "id": "msg_99283",
      "from": "Google",
      "text": "G-726263 es tu código de verificación",
      "received_at": "2026-02-22T19:05:00Z"
    }
  ]
}`}
              />
            </div>
          </div>
        </section>

        {/* Webhooks */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-600">
              <Webhook className="size-5" />
            </div>
            <h3 className="text-2xl font-black tracking-tight">Webhooks</h3>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">
            Configura una URL de destino para recibir notificaciones PUSH cada vez que llegue un SMS. Enviamos un POST con el payload del mensaje.
          </p>
          <div className="bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-3xl p-8 space-y-4 shadow-soft">
            <div className="flex items-center gap-3 text-primary">
              <ShieldCheck className="size-5" />
              <span className="text-xs font-black uppercase tracking-widest">Seguridad de Webhooks</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Cada solicitud de webhook incluye una firma <code className="text-primary font-bold">X-TELSIM-SIGNATURE</code> generada con tu secreto de webhook para que puedas validar que la solicitud proviene de nuestros servidores.
            </p>
          </div>
        </section>

        {/* SDKs */}
        <section className="pt-12 border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-8 bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-soft flex flex-col gap-4">
              <div className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-900 dark:text-white">
                <Terminal className="size-6" />
              </div>
              <h4 className="text-lg font-black tracking-tight">Node.js SDK</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Instala nuestro cliente oficial para Node.js y comienza en segundos.</p>
              <code className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl text-[10px] font-mono text-primary font-bold">npm install @telsim/node</code>
            </div>

            <div className="p-8 bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-soft flex flex-col gap-4">
              <div className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-900 dark:text-white">
                <Cpu className="size-6" />
              </div>
              <h4 className="text-lg font-black tracking-tight">Python Library</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Perfecto para scripts de automatización y bots de scraping.</p>
              <code className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl text-[10px] font-mono text-primary font-bold">pip install telsim-py</code>
            </div>
          </div>
        </section>

        <footer className="text-center pt-12 opacity-30">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">TELSIM API Reference v1.0.4</p>
        </footer>
      </main>
    </div>
  );
};

export default ApiDocs;
