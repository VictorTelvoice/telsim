
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Mail } from 'lucide-react';

const WebhookGuide: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'n8n' | 'make' | 'zapier' | 'node' | 'python'>('n8n');

  const tabs = [
    { id: 'n8n', label: 'n8n' },
    { id: 'make', label: 'Make.com' },
    { id: 'zapier', label: 'Zapier' },
    { id: 'node', label: 'Node.js' },
    { id: 'python', label: 'Python' },
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-display pb-20">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition text-slate-400">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Guía de Configuración</h1>
        <div className="size-9"></div>
      </header>

      {/* HERO */}
      <section className="bg-white border-b border-slate-100 px-6 py-12 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full mb-6">
            <span>⚡</span> API & Webhooks en tiempo real
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-4 text-slate-900 leading-tight">
            Recibe cada SMS<br/>en tu sistema al instante
          </h1>
          <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed max-w-md mx-auto">
            Telsim notifica tu servidor en milisegundos cada vez que llega un SMS. Sin polling. Sin esperas. Compatible con n8n, Make, Zapier y cualquier servidor propio.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {['n8n', 'Make.com', 'Zapier', 'Node.js', 'Python', 'Cualquier HTTP'].map((tech) => (
              <span key={tech} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-full">
                ✅ {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PASOS */}
      <section className="px-6 py-12 max-w-2xl mx-auto">
        <h2 className="text-xl font-black tracking-tight mb-2 text-center uppercase">Actívalo en 3 pasos</h2>
        <p className="text-slate-400 text-xs text-center font-medium mb-10">Sin código requerido para empezar</p>

        <div className="space-y-2 relative">
          {/* Paso 1 */}
          <div className="relative flex gap-5 pb-10">
            <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-slate-200"></div>
            <div className="size-10 rounded-full bg-primary text-white font-black text-sm flex items-center justify-center flex-shrink-0 z-10 shadow-lg shadow-blue-500/20">1</div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 flex-1 shadow-sm">
              <h3 className="font-black text-slate-900 text-sm mb-1 uppercase tracking-tight">Obtén tu URL de webhook</h3>
              <p className="text-slate-500 text-xs font-medium mb-4 leading-relaxed">Usa tu propio servidor o herramientas como n8n, Make, Zapier o webhook.site para pruebas.</p>
              <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                <code className="text-emerald-400 font-mono text-[11px] whitespace-nowrap">https://tu-servidor.com/webhook/telsim</code>
              </div>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="relative flex gap-5 pb-10">
            <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-slate-200"></div>
            <div className="size-10 rounded-full bg-primary text-white font-black text-sm flex items-center justify-center flex-shrink-0 z-10 shadow-lg shadow-blue-500/20">2</div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 flex-1 shadow-sm">
              <h3 className="font-black text-slate-900 text-sm mb-1 uppercase tracking-tight">Configúralo en Telsim</h3>
              <p className="text-slate-500 text-xs font-medium leading-relaxed">Ve a <span className="font-bold text-slate-700">Ajustes → API & Webhooks</span>, pega tu URL y activa el toggle. Listo.</p>
            </div>
          </div>

          {/* Paso 3 */}
          <div className="relative flex gap-5">
            <div className="size-10 rounded-full bg-primary text-white font-black text-sm flex items-center justify-center flex-shrink-0 z-10 shadow-lg shadow-blue-500/20">3</div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 flex-1 shadow-sm">
              <h3 className="font-black text-slate-900 text-sm mb-1 uppercase tracking-tight">Recibe los SMS automáticamente</h3>
              <p className="text-slate-500 text-xs font-medium mb-4 leading-relaxed">Cada SMS enviará un POST JSON a tu URL con todos los datos.</p>
              <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                <pre className="text-emerald-400 font-mono text-[11px] leading-relaxed">
{`{
  "event": "sms.received",
  "from": "Google",
  "content": "Tu código es 847291",
  "verification_code": "847291",
  "phone_number": "+56 9 3444 9937",
  "received_at": "2026-02-23T19:18:22Z"
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTEGRACIONES */}
      <section className="bg-white border-y border-slate-100 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-black tracking-tight mb-2 text-center uppercase">Ejemplos de integración</h2>
          <p className="text-slate-400 text-xs text-center font-medium mb-8">Selecciona tu plataforma</p>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap mb-8 justify-center">
            {tabs.map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)} 
                className={`text-[10px] font-black px-4 py-2 rounded-full border-2 transition-all ${
                  activeTab === tab.id 
                  ? 'bg-primary text-white border-primary shadow-md' 
                  : 'border-slate-100 text-slate-400 hover:border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="animate-in fade-in duration-300">
            {activeTab === 'n8n' && (
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <ol className="space-y-4 text-xs font-semibold text-slate-700">
                    <li className="flex gap-3"><span className="font-black text-primary">1.</span> Crea un nuevo Workflow en n8n</li>
                    <li className="flex gap-3"><span className="font-black text-primary">2.</span> Agrega un nodo <strong>Webhook</strong> como trigger → Method: POST</li>
                    <li className="flex gap-3"><span className="font-black text-primary">3.</span> Copia la <strong>Production URL</strong> y pégala en Telsim</li>
                    <li className="flex gap-3"><span className="font-black text-primary">4.</span> Activa el Workflow y espera el primer SMS</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acceder a los campos:</p>
                  <div className="bg-slate-900 rounded-xl p-4">
                    <code className="text-emerald-400 font-mono text-[11px] leading-relaxed">
                      {`{{ $json.verification_code }}\n{{ $json.phone_number }}\n{{ $json.from }}\n{{ $json.content }}`}
                    </code>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'make' && (
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <ol className="space-y-4 text-xs font-semibold text-slate-700">
                    <li className="flex gap-3"><span className="font-black text-primary">1.</span> Crea un nuevo Scenario en Make</li>
                    <li className="flex gap-3"><span className="font-black text-primary">2.</span> Primer módulo: <strong>Webhooks → Custom Webhook</strong></li>
                    <li className="flex gap-3"><span className="font-black text-primary">3.</span> Crea el webhook y copia la URL generada</li>
                    <li className="flex gap-3"><span className="font-black text-primary">4.</span> Pégala en Telsim y envía un SMS de prueba para mapear los campos</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Variables:</p>
                  <div className="bg-slate-900 rounded-xl p-4">
                    <code className="text-emerald-400 font-mono text-[11px] leading-relaxed">
                      {`{{verification_code}}\n{{phone_number}}\n{{from}}\n{{content}}`}
                    </code>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'zapier' && (
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <ol className="space-y-4 text-xs font-semibold text-slate-700">
                  <li className="flex gap-3"><span className="font-black text-primary">1.</span> Crea un nuevo Zap en Zapier</li>
                  <li className="flex gap-3"><span className="font-black text-primary">2.</span> Trigger: <strong>Webhooks by Zapier → Catch Hook</strong></li>
                  <li className="flex gap-3"><span className="font-black text-primary">3.</span> Copia la URL y pégala en Telsim</li>
                  <li className="flex gap-3"><span className="font-black text-primary">4.</span> Envía un SMS de prueba para que Zapier detecte la estructura</li>
                  <li className="flex gap-3"><span className="font-black text-primary">5.</span> Conecta tus acciones: Gmail, Sheets, Slack, etc.</li>
                </ol>
              </div>
            )}

            {activeTab === 'node' && (
              <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                <pre className="text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto">
{`const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook/telsim', (req, res) => {
  const { verification_code, phone_number, from } = req.body;
  console.log(\`SMS en \${phone_number} de \${from}\`);
  console.log(\`Código: \${verification_code}\`);
  res.status(200).json({ ok: true });
});

app.listen(3000);`}
                </pre>
              </div>
            )}

            {activeTab === 'python' && (
              <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                <pre className="text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto">
{`from flask import Flask, request, jsonify
app = Flask(__name__)

@app.route('/webhook/telsim', methods=['POST'])
def receive_sms():
    data = request.json
    code = data.get('verification_code')
    phone = data.get('phone_number')
    print(f'SMS en {phone} — Código: {code}')
    return jsonify({'ok': True}), 200`}
                </pre>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 text-center max-w-xl mx-auto space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-black tracking-tight uppercase">¿Necesitas el manual completo?</h2>
          <p className="text-slate-500 text-xs font-medium leading-relaxed">Descarga la documentación técnica completa con todos los ejemplos, estructura del payload y solución de problemas.</p>
        </div>
        <button className="w-full h-16 bg-primary text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all">
          <FileText className="size-5" />
          Descargar Manual PDF
        </button>
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Mail className="size-4" />
          <p className="text-[10px] font-bold uppercase tracking-widest">¿Dudas? soporte@telsim.io</p>
        </div>
      </section>
    </div>
  );
};

export default WebhookGuide;
