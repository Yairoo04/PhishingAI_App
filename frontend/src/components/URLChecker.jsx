import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

const URLChecker = ({ setLoading, loading, onResult, urlToCheck, triggerCheck }) => {
    const { t } = useTranslation();
    const { theme, darkMode } = useTheme();
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (urlToCheck) {
            setUrl(urlToCheck);
            if (triggerCheck) handleCheck(null, urlToCheck);
        }
    }, [urlToCheck, triggerCheck]);

    const isValidUrl = (string) => {
        try {
            if (!string.includes('://')) {
                string = 'https://' + string;
            }
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    };

    const handleCheck = async (e, forcedUrl = null) => {
        if (e) e.preventDefault();
        const targetUrl = forcedUrl || url;

        if (!targetUrl.trim()) return;

        let finalUrl = targetUrl.trim();
        if (!finalUrl.includes('://')) {
            finalUrl = 'https://' + finalUrl;
        }

        if (!isValidUrl(finalUrl)) {
            setError('Please enter a valid URL');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/url/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: finalUrl })
            });
            const data = await response.json();
            onResult({ ...data, url: finalUrl });
        } catch (error) {
            console.error('Scan failed:', error);
            setError(t('tools.checkers.scan_failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-green-500 bg-opacity-10 text-green-500 mb-6 shadow-lg shadow-green-500/10 border border-green-500/20">
                    <i className="bx bx-world text-5xl" />
                </div>
                <h3 className="text-2xl font-black mb-3 tracking-tight" style={{ color: theme.text }}>
                    {t('tools.checkers.url_title')}
                </h3>
                <p className="text-sm opacity-60 max-w-md mx-auto leading-relaxed" style={{ color: theme.text }}>
                    {t('tools.desc.url')}
                </p>
            </div>

            <form onSubmit={handleCheck} className="relative group">
                <div className="relative flex items-center">
                    <div className="absolute left-6 text-green-500 text-xl group-focus-within:scale-110 transition-transform">
                        <i className="bx bx-link" />
                    </div>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => { setUrl(e.target.value); setError(''); }}
                        placeholder={t('tools.checkers.url_placeholder')}
                        disabled={loading}
                        className="w-full pl-16 pr-44 py-6 rounded-3xl font-bold transition-all duration-300 border-2 outline-none"
                        style={{ 
                            color: theme.text,
                            backgroundColor: theme.bgInput || (darkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc'),
                            borderColor: error ? 'rgba(239,68,68,0.5)' : (darkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
                        }}
                    />
                    <div className="absolute right-3">
                        <button
                            type="submit"
                            disabled={loading || !url.trim()}
                            className={`px-8 py-3.5 rounded-2xl font-black text-xs tracking-widest uppercase transition-all duration-300
                                ${url.trim() && !loading
                                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 hover:-translate-y-0.5 active:scale-95'
                                    : 'bg-gray-500/20 text-gray-500'}`}
                        >
                            {loading ? <i className="bx bx-loader-alt bx-spin" /> : t('tools.checkers.analyze_btn')}
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-6 mt-3 text-red-500 text-xs font-bold"
                        >
                            <i className="bx bx-error-circle mr-1" /> {error}
                        </motion.div>
                    )}
                </AnimatePresence>
            </form>

            <div className="mt-12 flex flex-wrap justify-center gap-6 opacity-40">
                {['Real-time DNS check', 'Static URL analysis', 'Domain Reputation', 'PhishTank Feed'].map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <i className="bx bx-check-shield text-green-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: theme.text }}>{f}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default URLChecker;