import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const themes = {
    dark: {
        // ── Backgrounds ──────────────────────────────────────────────
        bg: '#0a0a0b',
        bgCard: '#111114',
        bgCard2: '#16161a',
        bgInput: '#0f172a',
        panelBg: '#111114',
        // ── Text ─────────────────────────────────────────────────────
        text: '#f8fafc',
        textSub: '#e2e8f0',
        textMuted: '#94a3b8',
        textDim: '#64748b',
        textFaint: '#475569',
        // ── Borders ──────────────────────────────────────────────────
        border: '#1e293b',
        tableBorder: '#1e293b',
        inputBorder: '#334155',
        // ── Misc ─────────────────────────────────────────────────────
        gridLine: 'rgba(255,255,255,0.03)',
        badgeBg: '#1e293b',
        // ── Navbar-specific ──────────────────────────────────────────
        navbarBg: '#000000',
        navbarScrollBg: 'rgba(0,0,0,0.95)',
        navbarScrollBorder: 'rgba(255,255,255,0.10)',
        navbarScrollShadow: '0 8px 32px rgba(0,0,0,0.45)',
        navBtnBg: 'rgba(255,255,255,0.10)',
        navBtnBorder: 'rgba(255,255,255,0.10)',
        navBtnHover: 'rgba(255,255,255,0.15)',
        navBtnColor: '#ffffff',
        navDropdownBg: 'rgba(15,23,42,0.98)',
        navDropdownBorder: 'rgba(255,255,255,0.10)',
        navItemHover: 'rgba(255,255,255,0.08)',
        mobileLinkBg: 'rgba(30,41,59,0.6)',
        mobileLinkBorder: 'rgba(255,255,255,0.08)',
        mobileMenuBg: 'linear-gradient(160deg, #0a0a0b 0%, #111827 100%)',
        // ── Status colors ────────────────────────────────────────────
        statusBarBg: 'rgba(16,185,129,0.05)',
        // ── Loading overlay ──────────────────────────────────────────
        loadingBarBg: 'rgba(255,255,255,0.08)',
    },
    light: {
        // ── Backgrounds ──────────────────────────────────────────────
        bg: '#f8fafc',
        bgCard: '#ffffff',
        bgCard2: '#f1f5f9',
        bgInput: '#ffffff',
        panelBg: '#f1f5f9',
        // ── Text ─────────────────────────────────────────────────────
        text: '#0f172a',
        textSub: '#334155',
        textMuted: '#475569',
        textDim: '#64748b',
        textFaint: '#94a3b8',
        // ── Borders ──────────────────────────────────────────────────
        border: '#e2e8f0',
        tableBorder: '#e2e8f0',
        inputBorder: '#cbd5e1',
        // ── Misc ─────────────────────────────────────────────────────
        gridLine: 'rgba(0,0,0,0.04)',
        badgeBg: '#f1f5f9',
        // ── Navbar-specific ──────────────────────────────────────────
        navbarBg: '#ffffff',
        navbarScrollBg: 'rgba(255,255,255,0.95)',
        navbarScrollBorder: 'rgba(0,0,0,0.08)',
        navbarScrollShadow: '0 8px 32px rgba(0,0,0,0.10)',
        navBtnBg: 'rgba(0,0,0,0.05)',
        navBtnBorder: 'rgba(0,0,0,0.10)',
        navBtnHover: 'rgba(0,0,0,0.08)',
        navBtnColor: '#0f172a',
        navDropdownBg: 'rgba(255,255,255,0.98)',
        navDropdownBorder: 'rgba(0,0,0,0.08)',
        navItemHover: 'rgba(0,0,0,0.05)',
        mobileLinkBg: 'rgba(241,245,249,0.85)',
        mobileLinkBorder: 'rgba(0,0,0,0.08)',
        mobileMenuBg: 'linear-gradient(160deg, #f8fafc 0%, #e2e8f0 100%)',
        // ── Status colors ────────────────────────────────────────────
        statusBarBg: 'rgba(16,185,129,0.06)',
        // ── Loading overlay ──────────────────────────────────────────
        loadingBarBg: 'rgba(0,0,0,0.06)',
    }
};

export const ThemeProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('phishing_detector_theme');
        return saved ? JSON.parse(saved) : true;
    });

    const toggleDarkMode = () => setDarkMode(prev => !prev);

    useEffect(() => {
        localStorage.setItem('phishing_detector_theme', JSON.stringify(darkMode));
        const root = document.documentElement;
        if (darkMode) {
            root.classList.add('dark');
            root.classList.remove('light');
        } else {
            root.classList.add('light');
            root.classList.remove('dark');
        }
        document.body.style.backgroundColor = darkMode ? themes.dark.bg : themes.light.bg;
        document.body.style.color = darkMode ? themes.dark.text : themes.light.text;
        // Smooth transition on body
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    }, [darkMode]);

    const theme = darkMode ? themes.dark : themes.light;

    return (
        <ThemeContext.Provider value={{ darkMode, setDarkMode, toggleDarkMode, theme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
