export const SERVICE_MAP: Record<string, { label: string; color: string; bg: string; darkBg: string; keywords: string[] }> = {
  whatsapp: { 
    label: 'WhatsApp', 
    color: '#25D366', 
    bg: '#dcfce7', 
    darkBg: '#14532d',
    keywords: ['whatsapp', 'wa.me']
  },
  google: { 
    label: 'Google', 
    color: '#4285F4', 
    bg: '#dbeafe', 
    darkBg: '#1e3a8a',
    keywords: ['google', 'g-', 'youtube']
  },
  facebook: { 
    label: 'Facebook', 
    color: '#1877F2', 
    bg: '#dbeafe', 
    darkBg: '#1e3a8a',
    keywords: ['facebook', 'fb-']
  },
  instagram: { 
    label: 'Instagram', 
    color: '#E1306C', 
    bg: '#fce7f3', 
    darkBg: '#831843',
    keywords: ['instagram', 'ig-']
  },
  telegram: { 
    label: 'Telegram', 
    color: '#229ED9', 
    bg: '#e0f2fe', 
    darkBg: '#0c4a6e',
    keywords: ['telegram', 'tg-']
  },
  amazon: { 
    label: 'Amazon', 
    color: '#FF9900', 
    bg: '#fef3c7', 
    darkBg: '#78350f',
    keywords: ['amazon', 'amzn']
  },
  microsoft: { 
    label: 'Microsoft', 
    color: '#00A4EF', 
    bg: '#e0f2fe', 
    darkBg: '#0c4a6e',
    keywords: ['microsoft', 'msft', 'outlook', 'azure']
  },
  twitter: { 
    label: 'Twitter/X', 
    color: '#1DA1F2', 
    bg: '#dbeafe', 
    darkBg: '#1e3a8a',
    keywords: ['twitter', ' x ', 'x.com', 't.co']
  },
  uber: { 
    label: 'Uber', 
    color: '#06b6d4', 
    bg: '#cffafe', 
    darkBg: '#164e63',
    keywords: ['uber']
  },
  tiktok: { 
    label: 'TikTok', 
    color: '#ff0050', 
    bg: '#fce7f3', 
    darkBg: '#831843',
    keywords: ['tiktok']
  },
  netflix: { 
    label: 'Netflix', 
    color: '#E50914', 
    bg: '#fee2e2', 
    darkBg: '#7f1d1d',
    keywords: ['netflix']
  },
  spotify: { 
    label: 'Spotify', 
    color: '#1DB954', 
    bg: '#dcfce7', 
    darkBg: '#14532d',
    keywords: ['spotify']
  },
  apple: { 
    label: 'Apple', 
    color: '#555555', 
    bg: '#f1f5f9', 
    darkBg: '#1e293b',
    keywords: ['apple', 'icloud']
  },
  paypal: { 
    label: 'PayPal', 
    color: '#003087', 
    bg: '#dbeafe', 
    darkBg: '#1e3a8a',
    keywords: ['paypal']
  },
  discord: { 
    label: 'Discord', 
    color: '#5865F2', 
    bg: '#ede9fe', 
    darkBg: '#3730a3',
    keywords: ['discord']
  }
};

export function detectService(sender: string, content: string) {
  const text = (sender + ' ' + content).toLowerCase();
  for (const [key, val] of Object.entries(SERVICE_MAP)) {
    if (val.keywords.some(kw => text.includes(kw))) {
      return { key, ...val };
    }
  }
  return { 
    key: 'other', 
    label: 'SMS Genérico', 
    color: '#64748b', 
    bg: '#f1f5f9', 
    darkBg: '#1e293b' 
  };
}

export function extractCode(content: string): string | null {
  // Busca 4 a 8 dígitos seguidos, o con un espacio/guión en medio (ej: 123 456 o 123-456)
  const m = content.match(/\b(\d{2,4}[\s-]?\d{2,4})\b/);
  if (!m) return null;
  
  // Limpiamos espacios y guiones para retornar solo los números
  const clean = m[1].replace(/[\s-]/g, '');
  
  // Verificamos que al final tengamos entre 4 y 8 dígitos
  if (clean.length >= 4 && clean.length <= 8) {
    return clean;
  }
  
  return null;
}
