import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { saveScan } from '../utils/historyManager';
import URLChecker from '../components/URLChecker';
import ImageChecker from '../components/ImageChecker';
import FileChecker from '../components/FileChecker';
import EmailChecker from '../components/EmailChecker';
import ResultDisplay from '../components/ResultDisplay';

const PhishingTools = () => {
    const { t } = useTranslation();
    const { theme, darkMode } = useTheme();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState('url');
    const [tabResults, setTabResults] = useState({ url: { result: null }, image: { result: null }, file: { result: null }, email: { result: null } });
    const [loading, setLoading] = useState(false);
    const [urlToCheck, setUrlToCheck] = useState('');
    const [triggerCheck, setTriggerCheck] = useState(false);

    const TABS = [
        { id: 'url', label: t('tools.tabs.url'), desc: t('tools.desc.url'), icon: 'bx-link', accentColor: '#10b981', accentRgb: '16,185,129' },
        { id: 'image', label: t('tools.tabs.image'), desc: t('tools.desc.image'), icon: 'bx-image-alt', accentColor: '#8b5cf6', accentRgb: '139,92,246' },
        { id: 'file', label: t('tools.tabs.file'), desc: t('tools.desc.file'), icon: 'bx-file-blank', accentColor: '#f59e0b', accentRgb: '245,158,11' },
        { id: 'email', label: t('tools.tabs.email'), desc: t('tools.desc.email'), icon: 'bx-envelope', accentColor: '#0ea5e9', accentRgb: '14,165,233' },
    ];

    // Read URL from query params (from Home page navigation)
    useEffect(() => {
        const urlParam = searchParams.get('url');
        if (urlParam) {
            setUrlToCheck(urlParam);
            setTriggerCheck(true);
            setActiveTab('url');
        }
    }, [searchParams]);

    useEffect(() => {
        if (activeTab !== 'url') {
            setUrlToCheck('');
            setTriggerCheck(false);
        }
    }, [activeTab]);

    const handleResult = (data) => {
        setTabResults(prev => ({ ...prev, [activeTab]: { result: data } }));

        let target = '';
        let result = data.prediction || data.result;
        let icon = 'bx-link';
        let confidence = data.phishing_probability || 0;

        if (activeTab === 'url') {
            target = data.url || 'URL Scan';
            icon = 'bx-link';
        } else if (activeTab === 'image') {
            target = data.filename || 'Image/QR Scan';
            icon = 'bx-image-alt';
            if (data.type === 'qr_codes' && data.results?.length > 0) {
                target = data.results[0].qr_url;
                result = data.results[0].prediction;
                confidence = data.results[0].phishing_probability;
            }
        } else if (activeTab === 'file') {
            target = data.filename || 'PDF Document';
            icon = 'bx-file-blank';
        } else if (activeTab === 'email') {
            target = data.filename || 'Email File';
            icon = 'bx-envelope';
        }

        saveScan({ type: activeTab, target, result, confidence, icon });

        if (activeTab === 'image' && data.qr_results?.length > 0) {
            const qrUrl = data.qr_results[0]?.qr_url;
            if (qrUrl) {
                setTabResults(prev => ({ ...prev, url: { result: { ...data.qr_results[0], url: qrUrl } } }));
                setUrlToCheck(qrUrl);
                setActiveTab('url');
            }
        }
    };

    const activeInfo = TABS.find(tab => tab.id === activeTab);
    const currentResult = tabResults[activeTab]?.result;

    return (
        <div className="min-h-screen pt-24 pb-20 transition-colors duration-300 relative" style={{ background: theme.bg }}>
            {/* Background Grid */}
            <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(${theme.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridLine} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

            {darkMode && (
                <>
                    <div className="fixed top-[15%] -left-[200px] w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none opacity-20" style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
                    <div className="fixed bottom-[20%] -right-[200px] w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none opacity-20" style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
                </>
            )}

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-1 h-6 bg-green-500 rounded-full" />
                        <span className="text-green-500 text-xs font-bold tracking-[0.2em] uppercase">
                            {t('tools.phishing_header')}
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight" style={{ color: theme.text }}>
                        {t('tools.phishing_title')} <span className="text-green-500">{t('tools.phishing_title_hl')}</span> {t('tools.phishing_title_end')}
                    </h1>
                    <p className="text-sm md:text-base mt-3 max-w-2xl opacity-70" style={{ color: theme.text }}>
                        {t('tools.phishing_subtitle')}
                    </p>
                </motion.div>

                {/* Tabs Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-1">
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-4 p-5 rounded-t-xl border-t border-l border-r transition-all duration-300 text-left group
                                    ${isActive
                                        ? 'bg-opacity-10 border-opacity-40'
                                        : 'hover:bg-opacity-5'
                                    }`}
                                style={{
                                    background: isActive ? `rgba(${tab.accentRgb}, 0.1)` : theme.bgCard,
                                    borderColor: isActive ? `rgba(${tab.accentRgb}, 0.4)` : theme.border,
                                    borderBottom: isActive ? `2px solid ${tab.accentColor}` : `1px solid ${theme.border}`
                                }}
                            >
                                <div className={`w-12 h-12 flex items-center justify-center rounded-lg border transition-all duration-300 
                                    ${isActive ? 'scale-110 shadow-lg' : 'group-hover:scale-105'}`}
                                    style={{
                                        background: isActive ? `rgba(${tab.accentRgb}, 0.15)` : theme.badgeBg,
                                        borderColor: isActive ? `rgba(${tab.accentRgb}, 0.4)` : 'transparent',
                                        color: isActive ? tab.accentColor : theme.textFaint
                                    }}
                                >
                                    <i className={`bx ${tab.icon} text-2xl`} />
                                </div>
                                <div className="hidden sm:block">
                                    <div className="font-bold text-sm tracking-wide" style={{ color: isActive ? theme.text : theme.textMuted }}>{tab.label}</div>
                                    <div className="text-[10px] uppercase font-semibold tracking-wider mt-0.5 opacity-60" style={{ color: isActive ? tab.accentColor : theme.textDim }}>{tab.desc}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Main Content Area */}
                <motion.div
                    layout
                    className="rounded-b-2xl border-x border-b overflow-hidden shadow-2xl backdrop-blur-md"
                    style={{
                        background: theme.bgCard2,
                        borderColor: `rgba(${activeInfo?.accentRgb}, 0.4)`,
                        boxShadow: darkMode ? 'none' : '0 20px 50px rgba(0,0,0,0.1)'
                    }}
                >
                    {/* Status Bar */}
                    <div className="px-6 py-3 flex items-center justify-between border-b" style={{ background: `rgba(${activeInfo?.accentRgb}, 0.05)`, borderColor: `rgba(${activeInfo?.accentRgb}, 0.2)` }}>
                        <div className="flex items-center gap-3">
                            <i className={`bx ${activeInfo?.icon}`} style={{ color: activeInfo?.accentColor }} />
                            <span className="text-[10px] font-black tracking-[0.15em] uppercase" style={{ color: activeInfo?.accentColor }}>
                                {activeInfo?.label} ANALYZER
                            </span>
                            <span className="w-1 h-1 rounded-full bg-current opacity-30" />
                            <span className="text-[10px] font-bold opacity-50" style={{ color: theme.text }}>
                                {activeInfo?.desc.toUpperCase()}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <motion.div
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,1)]"
                            />
                            <span className="text-[10px] font-black text-green-500 tracking-wider">{t('tools.engine_status')}</span>
                        </div>
                    </div>

                    <div className="p-8 md:p-12">
                        {/* Fix chính: mode="sync" + initial={false} + duration ngắn */}
                        <AnimatePresence mode="sync">
                            <motion.div
                                key={activeTab}
                                initial={false}                    // Bỏ animation enter khi mount lần đầu → nhanh hơn
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}      // Chỉ opacity + translate nhẹ, tránh lag
                                transition={{ duration: 0.2 }}     // Ngắn để click responsive ngay
                                className="w-full"
                            >
                                {activeTab === 'url' && (
                                    <URLChecker
                                        setLoading={setLoading}
                                        loading={loading}
                                        onResult={handleResult}
                                        urlToCheck={urlToCheck}
                                        triggerCheck={triggerCheck}
                                    />
                                )}
                                {activeTab === 'image' && (
                                    <ImageChecker
                                        setLoading={setLoading}
                                        onResult={handleResult}
                                    />
                                )}
                                {activeTab === 'file' && (
                                    <FileChecker
                                        setLoading={setLoading}
                                        onResult={handleResult}
                                    />
                                )}
                                {activeTab === 'email' && (
                                    <EmailChecker
                                        setLoading={setLoading}
                                        loading={loading}
                                        onResult={handleResult}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Analysis Loading Overlay */}
                <AnimatePresence>
                    {loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="mt-6 p-8 rounded-2xl border backdrop-blur-xl"
                            style={{ background: theme.bgCard, borderColor: 'rgba(16,185,129,0.2)' }}
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="text-3xl text-green-500"
                                >
                                    <i className="bx bx-loader-alt" />
                                </motion.div>
                                <div>
                                    <h4 className="font-bold text-lg" style={{ color: theme.text }}>{t('tools.analyzing')}</h4>
                                    <p className="text-xs opacity-60" style={{ color: theme.text }}>
                                        {t('tools.analyzing_detail')}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {[85, 65, 45].map((w, i) => (
                                    <div key={i} className="h-2 rounded-full bg-opacity-10 overflow-hidden" style={{ background: theme.text }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${w}%` }}
                                            transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", delay: i * 0.2 }}
                                            className="h-full bg-gradient-to-r from-green-500 to-teal-400"
                                        />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Results Section */}
                <AnimatePresence>
                    {!loading && currentResult && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-8"
                        >
                            <ResultDisplay result={currentResult} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Performance Stats */}
                {!loading && !currentResult && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12"
                    >
                        {[
                            { icon: 'bx-brain', title: t('tools.stacking_title'), desc: t('tools.stacking_desc'), val: '99.1%', label: t('tools.accuracy'), color: '#10b981' },
                            { icon: 'bx-chip', title: t('tools.efficientnet_title'), desc: t('tools.efficientnet_desc'), val: '96.3%', label: t('tools.f1_score'), color: '#8b5cf6' },
                            { icon: 'bx-mail-send', title: t('tools.nlp_title'), desc: t('tools.nlp_desc'), val: '97.8%', label: t('tools.auc_roc'), color: '#0ea5e9' },
                        ].map((c, i) => (
                            <div key={i} className="p-6 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
                                style={{ background: theme.bgCard, borderColor: theme.border }}>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 rounded-xl bg-opacity-10 transition-colors duration-300" style={{ background: c.color, color: c.color }}>
                                        <i className={`bx ${c.icon} text-2xl`} />
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black tracking-tight" style={{ color: c.color }}>{c.val}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: theme.text }}>{c.label}</div>
                                    </div>
                                </div>
                                <h3 className="font-bold text-base mb-2" style={{ color: theme.text }}>{c.title}</h3>
                                <p className="text-xs leading-relaxed opacity-60 font-medium" style={{ color: theme.text }}>{c.desc}</p>
                            </div>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default PhishingTools;