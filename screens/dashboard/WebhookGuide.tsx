
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Mail } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const WebhookGuide: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
        <h1 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">{t('webhook_guide.title')}</h1>
        <div className="size-9"></div>
      </header>

      {/* HERO */}
      <section className="bg-white border-b border-slate-100 px-6 py-12 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full mb-6">
            <span>⚡</span> {t('webhook_guide.hero_badge')}
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-4 text-slate-900 leading-tight">
            {t('webhook_guide.hero_title')}
          </h1>
          <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed max-w-md mx-auto">
            {t('webhook_guide.hero_desc')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {['n8n', 'Make.com', 'Zapier', 'Node.js', 'Python', t('webhook_guide.any_http')].map((tech) => (
              <span key={tech} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-full">
                ✅ {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PASOS */}
      <section className="px-6 py-12 max-w-2xl mx-auto">
        <h2 className="text-xl font-black tracking-tight mb-2 text-center uppercase">{t('webhook_guide.steps_title')}</h2>
        <p className="text-slate-400 text-xs text-center font-medium mb-10">{t('webhook_guide.steps_subtitle')}</p>

        <div className="space-y-2 relative">
          {/* Paso 1 */}
          <div className="relative flex gap-5 pb-10">
            <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-slate-200"></div>
            <div className="size-10 rounded-full bg-primary text-white font-black text-sm flex items-center justify-center flex-shrink-0 z-10 shadow-lg shadow-blue-500/20">1</div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 flex-1 shadow-sm">
              <h3 className="font-black text-slate-900 text-sm mb-1 uppercase tracking-tight">{t('webhook_guide.step1_title')}</h3>
              <p className="text-slate-500 text-xs font-medium mb-4 leading-relaxed">{t('webhook_guide.step1_desc')}</p>
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
              <h3 className="font-black text-slate-900 text-sm mb-1 uppercase tracking-tight">{t('webhook_guide.step2_title')}</h3>
              <p className="text-slate-500 text-xs font-medium leading-relaxed">{t('webhook_guide.step2_desc')}</p>
            </div>
          </div>

          {/* Paso 3 */}
          <div className="relative flex gap-5">
            <div className="size-10 rounded-full bg-primary text-white font-black text-sm flex items-center justify-center flex-shrink-0 z-10 shadow-lg shadow-blue-500/20">3</div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 flex-1 shadow-sm">
              <h3 className="font-black text-slate-900 text-sm mb-1 uppercase tracking-tight">{t('webhook_guide.step3_title')}</h3>
              <p className="text-slate-500 text-xs font-medium mb-4 leading-relaxed">{t('webhook_guide.step3_desc')}</p>
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
          <h2 className="text-xl font-black tracking-tight mb-2 text-center uppercase">{t('webhook_guide.integrations_title')}</h2>
          <p className="text-slate-400 text-xs text-center font-medium mb-8">{t('webhook_guide.integrations_subtitle')}</p>

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
                    <li className="flex gap-3"><span className="font-black text-primary">1.</span> {t('webhook_guide.n8n_step1')}</li>
                    <li className="flex gap-3"><span className="font-black text-primary">2.</span> {t('webhook_guide.n8n_step2')}</li>
                    <li className="flex gap-3"><span className="font-black text-primary">3.</span> {t('webhook_guide.n8n_step3')}</li>
                    <li className="flex gap-3"><span className="font-black text-primary">4.</span> {t('webhook_guide.n8n_step4')}</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('webhook_guide.access_fields')}</p>
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
                    <li className="flex gap-3"><span className="font-black text-primary">1.</span> {t('webhook_guide.make_step1')}</li>
                    <li className="flex gap-3"><span className="font-black text-primary">2.</span> {t('webhook_guide.make_step2')}</li>
                    <li className="flex gap-3"><span className="font-black text-primary">3.</span> {t('webhook_guide.make_step3')}</li>
                    <li className="flex gap-3"><span className="font-black text-primary">4.</span> {t('webhook_guide.make_step4')}</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('webhook_guide.variables')}</p>
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
                  <li className="flex gap-3"><span className="font-black text-primary">1.</span> {t('webhook_guide.zapier_step1')}</li>
                  <li className="flex gap-3"><span className="font-black text-primary">2.</span> {t('webhook_guide.zapier_step2')}</li>
                  <li className="flex gap-3"><span className="font-black text-primary">3.</span> {t('webhook_guide.zapier_step3')}</li>
                  <li className="flex gap-3"><span className="font-black text-primary">4.</span> {t('webhook_guide.zapier_step4')}</li>
                  <li className="flex gap-3"><span className="font-black text-primary">5.</span> {t('webhook_guide.zapier_step5')}</li>
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
          <h2 className="text-xl font-black tracking-tight uppercase">{t('webhook_guide.manual_title')}</h2>
          <p className="text-slate-500 text-xs font-medium leading-relaxed">{t('webhook_guide.manual_desc')}</p>
        </div>
        <button className="w-full h-16 bg-primary text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all">
          <FileText className="size-5" />
          {t('webhook_guide.download_pdf')}
        </button>
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Mail className="size-4" />
          <p className="text-[10px] font-bold uppercase tracking-widest">{t('webhook_guide.doubts')}</p>
        </div>
      </section>
    </div>
  );
};

export default WebhookGuide;
