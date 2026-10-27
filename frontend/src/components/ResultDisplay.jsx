import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';

const ResultDisplay = ({ result }) => {
    const { t } = useTranslation();
    const { theme, darkMode } = useTheme();

    if (!result) return null;

    if (result.error) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-8 rounded-3xl border-2"
                style={{
                    borderColor: 'rgba(239,68,68,0.2)',
                    background: 'rgba(239,68,68,0.05)',
                    backdropFilter: 'blur(8px)',
                }}
            >
                <div className="flex items-center gap-4 mb-4 text-red-500">
                    <i className="bx bx-error-circle text-3xl" />
                    <h3 className="text-xl font-black tracking-tight">{t('tools.checkers.scan_failed')}</h3>
                </div>
                <p className="text-sm opacity-70" style={{ color: theme.text }}>{result.error}</p>
                {result.filename && (
                    <div className="mt-4 pt-4 text-xs opacity-50 font-mono" style={{ color: theme.text, borderTop: `1px solid rgba(239,68,68,0.1)` }}>
                        FILE: {result.filename}
                    </div>
                )}
            </motion.div>
        );
    }

    const isPhishing = result.prediction?.toLowerCase() === 'phishing' ||
        result.prediction?.toLowerCase() === 'malicious' ||
        result.prediction?.toLowerCase() === 'dangerous';

    const statusColor = isPhishing ? 'text-red-500' : 'text-green-500';
    const statusBg = isPhishing ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)';
    const statusBorderColor = isPhishing ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-12 overflow-hidden"
            style={{
                background: theme.bgCard,
                borderRadius: '2.5rem',
                border: `1px solid ${theme.border}`,
            }}
        >
            {/* Header / Status Banner */}
            <div className="p-10 relative overflow-hidden" style={{ background: statusBg, borderBottom: `1px solid ${statusBorderColor}` }}>
                <div className="absolute top-0 right-0 p-8 opacity-10" style={{ color: isPhishing ? '#ef4444' : '#22c55e' }}>
                    <i className={`bx ${isPhishing ? 'bx-shield-x' : 'bx-shield-check'} text-9xl`} />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4 opacity-60">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isPhishing ? 'bg-red-500' : 'bg-green-500'}`} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: theme.text }}>
                            {t('tools.checkers.analysis_complete')}
                        </span>
                    </div>

                    <h2 className="text-sm font-black uppercase tracking-widest opacity-50 mb-2" style={{ color: theme.text }}>
                        {t('tools.checkers.classification')}
                    </h2>
                    <div className={`text-6xl font-black tracking-tighter uppercase ${statusColor}`}>
                        {result.prediction}
                    </div>
                </div>
            </div>

            <div className="p-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Probabilities */}
                    <div className="space-y-8">
                        <div>
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-xs font-black uppercase tracking-widest opacity-50" style={{ color: theme.text }}>
                                    {t('tools.checkers.phishing_prob')}
                                </span>
                                <span className="text-2xl font-black font-mono text-red-500">
                                    {Math.round(result.phishing_probability || 0)}%
                                </span>
                            </div>
                            <div className="h-3 w-full rounded-full overflow-hidden" style={{ background: theme.badgeBg, border: `1px solid ${theme.border}` }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${result.phishing_probability || 0}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-xs font-black uppercase tracking-widest opacity-50" style={{ color: theme.text }}>
                                    {t('tools.checkers.legitimate_prob')}
                                </span>
                                <span className="text-2xl font-black font-mono text-green-500">
                                    {Math.round(result.legitimate_probability || 0)}%
                                </span>
                            </div>
                            <div className="h-3 w-full rounded-full overflow-hidden" style={{ background: theme.badgeBg, border: `1px solid ${theme.border}` }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${result.legitimate_probability || 0}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-green-600 to-green-400 shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                                />
                            </div>
                        </div>

                        {/* Features List */}
                        {result.features && Object.keys(result.features).length > 0 && (
                            <div className="pt-8" style={{ borderTop: `1px solid ${theme.border}` }}>
                                <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-6" style={{ color: theme.text }}>
                                    {t('tools.checkers.extracted_features')}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Object.entries(result.features).map(([key, value]) => (
                                        <div key={key} className="p-4 rounded-2xl flex justify-between items-center transition-all"
                                            style={{
                                                background: theme.badgeBg,
                                                border: `1px solid ${theme.border}`,
                                            }}
                                        >
                                            <span className="text-[10px] font-bold uppercase opacity-60" style={{ color: theme.text }}>
                                                {key.replace(/_/g, ' ')}
                                            </span>
                                            <span className={`text-xs font-black truncate max-w-[120px] ${value === 1 ? 'text-red-400' : value === 0 ? 'text-green-400' : ''
                                                }`} style={value !== 0 && value !== 1 ? { color: theme.text } : {}}>
                                                {String(value)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Adversarial Flags */}
                        {result.adversarial_flags && Object.keys(result.adversarial_flags).some(k => result.adversarial_flags[k]) && (
                            <div className="pt-8" style={{ borderTop: `1px solid ${theme.border}` }}>
                                <h3 className="text-xs font-black uppercase tracking-widest mb-4 text-orange-400">
                                    {t('tools.checkers.adversarial_flags')}
                                </h3>
                                <div className="space-y-2">
                                    {Object.entries(result.adversarial_flags)
                                        .filter(([k]) => ['unicode_spoofing', 'brand_impersonation', 'has_ical_url', 'has_xfa'].includes(k))
                                        .map(([key, val]) => (
                                            <div key={key} className="flex items-center justify-between p-3 rounded-xl"
                                                style={{ background: val ? 'rgba(239,68,68,0.08)' : theme.badgeBg, border: `1px solid ${val ? 'rgba(239,68,68,0.2)' : theme.border}` }}
                                            >
                                                <span className="text-[10px] font-bold uppercase" style={{ color: theme.textMuted }}>
                                                    {t(`tools.checkers.${key}`, key.replace(/_/g, ' '))}
                                                </span>
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${val ? 'text-red-400' : 'text-green-400'}`}>
                                                    {val ? t('tools.checkers.detected') : t('tools.checkers.clear')}
                                                </span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Visual Evidence / Screenshot */}
                    <div className="space-y-8">
                        {result.screenshot_url ? (
                            <div className="relative group">
                                <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-4" style={{ color: theme.text }}>
                                    {t('tools.checkers.screenshot')}
                                </h3>
                                <div className="rounded-3xl overflow-hidden shadow-2xl relative" style={{ border: `1px solid ${theme.border}` }}>
                                    <img src={result.screenshot_url} alt="Scan Evidence" className="w-full h-auto object-contain" style={{ background: theme.badgeBg }} />
                                    <div className="absolute inset-0 bg-green-500/5 mix-blend-overlay pointer-events-none" />
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-12 rounded-[2rem] border border-dashed opacity-30"
                                style={{ borderColor: theme.border, color: theme.text }}>
                                <i className="bx bx-scan text-6xl mb-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {t('tools.checkers.no_visual_evidence')}
                                </span>
                            </div>
                        )}

                        {/* Third Party */}
                        {result.third_party_eval && (
                            <div className="pt-8" style={{ borderTop: `1px solid ${theme.border}` }}>
                                <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-6" style={{ color: theme.text }}>
                                    {t('tools.checkers.external_intel')}
                                </h3>
                                <div className="space-y-4">
                                    {Object.entries(result.third_party_eval).map(([source, data]) => (
                                        <div key={source} className="flex items-center justify-between p-4 rounded-2xl"
                                            style={{ background: theme.badgeBg, border: `1px solid ${theme.border}` }}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${data.status.toLowerCase().includes('safe') ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <span className="text-xs font-black capitalize" style={{ color: theme.text }}>{source}</span>
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${data.status.toLowerCase().includes('safe') ? 'text-green-500' : 'text-red-500'}`}>
                                                {data.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: `1px solid ${theme.border}` }}>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: theme.text }}>
                        {result.filename
                            ? `${t('tools.checkers.source_label')}: ${result.filename}`
                            : `${t('tools.checkers.target_label')}: ${result.url || t('tools.checkers.analyzed_content')}`
                        }
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 rounded-xl transition-colors" style={{ background: theme.badgeBg, border: `1px solid ${theme.border}`, color: theme.text }}>
                            <i className="bx bx-share-alt" />
                        </button>
                        <button className="p-2 rounded-xl transition-colors" style={{ background: theme.badgeBg, border: `1px solid ${theme.border}`, color: theme.text }}>
                            <i className="bx bx-download" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ResultDisplay;
