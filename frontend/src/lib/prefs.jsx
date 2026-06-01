import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './i18n.js';

const PrefsContext = createContext(null);

export function PrefsProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('cq_theme') || 'dark');
  const [lang, setLang] = useState(() => localStorage.getItem('cq_lang') || 'en');

  useEffect(() => {
    localStorage.setItem('cq_theme', theme);
    document.body.style.background = theme === 'dark' ? '#0f1117' : '#f1f5f9';
    document.body.style.color = theme === 'dark' ? '#e2e8f0' : '#1e293b';
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('cq_lang', lang);
  }, [lang]);

  const t = (key) => translations[lang]?.[key] ?? translations['en']?.[key] ?? key;

  // CSS variable values per theme
  const colors = theme === 'dark' ? {
    bg: '#0f1117',
    bgSecondary: '#151a25',
    bgTertiary: '#1e293b',
    border: '#1e293b',
    borderLight: '#334155',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    textFaint: '#475569',
    navBg: '#0a0d14',
    cardBg: '#151a25',
    inputBg: '#0f1117',
    accent: '#22d3a5',
    accentBg: 'rgba(34,211,165,0.08)',
    accentBgHover: 'rgba(34,211,165,0.15)',
  } : {
    bg: '#f1f5f9',
    bgSecondary: '#ffffff',
    bgTertiary: '#e2e8f0',
    border: '#e2e8f0',
    borderLight: '#cbd5e1',
    text: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#475569',
    textFaint: '#64748b',
    navBg: '#ffffff',
    cardBg: '#ffffff',
    inputBg: '#f8fafc',
    accent: '#059669',
    accentBg: 'rgba(5,150,105,0.08)',
    accentBgHover: 'rgba(5,150,105,0.15)',
  };

  return (
    <PrefsContext.Provider value={{ theme, setTheme, lang, setLang, t, colors }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  return useContext(PrefsContext);
}
