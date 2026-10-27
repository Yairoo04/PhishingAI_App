import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { fetchHistory, clearHistory } from '../../utils/historyManager';
import { motion, AnimatePresence } from 'framer-motion';

const ScanHistory = () => {
    const { t } = useTranslation();
    const { theme, darkMode } = useTheme();
    const [history, setHistory] = useState([]);
    const [filter, setFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const loadHistory = async () => {
        const data = await fetchHistory();
        setHistory(data);
    };

    useEffect(() => {
        loadHistory();
        window.addEventListener('scanHistoryUpdated', loadHistory);
        return () => window.removeEventListener('scanHistoryUpdated', loadHistory);
    }, []);

    const stats = {
        total: history.length,
        threats: history.filter(h => ['phishing', 'malware', 'Dangerous', 'Malicious'].includes(h.result)).length,
        safe: history.filter(h => ['legitimate', 'Safe', 'Benign'].includes(h.result)).length
    };

    const filtered = history.filter(item => {
        const isThreat = ['phishing', 'malware', 'Dangerous', 'Malicious'].includes(item.result);
        if (filter === 'threat' && !isThreat) return false;
        if (filter === 'safe' && isThreat) return false;
        if (typeFilter !== 'all' && item.type !== typeFilter) return false;
        if (searchQuery && !item.target.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const handleDelete = (id) => {
        const current = JSON.parse(localStorage.getItem('phishing_ai_scan_history') || '[]');
        const updated = current.filter(i => i.id !== id);
        localStorage.setItem('phishing_ai_scan_history', JSON.stringify(updated));
        window.dispatchEvent(new Event('scanHistoryUpdated'));
    };

    const handleClearAll = () => {
        if (window.confirm(t('tools.checkers.clear_history') + '?')) {
            clearHistory();
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-20 px-4 sm:px-10 relative overflow-hidden" style={{ background: theme.bg }}>
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none opacity-20"
                style={{ backgroundImage: `radial-gradient(circle at 2px 2px, ${theme.text} 1px, transparent 0)`, backgroundSize: '40px 40px' }} />

            <div className="max-w-7xl mx-auto relative z-10">
                <header className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-1 ml-0 bg-blue-500 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">
                            {t('tools.checkers.history_subtitle')}
                        </span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter" style={{ color: theme.text }}>
                        {t('tools.checkers.history_title')}
                    </h1>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {[
                        { icon: 'bx-search-alt', label: t('tools.checkers.total_scans'), value: stats.total, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                        { icon: 'bx-shield-x', label: t('tools.checkers.threats_found'), value: stats.threats, color: 'text-red-500', bg: 'bg-red-500/10' },
                        { icon: 'bx-shield-check', label: t('tools.checkers.safe_found'), value: stats.safe, color: 'text-green-500', bg: 'bg-green-500/10' },
                    ].map((s, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="p-8 rounded-[2rem] border border-white/5 shadow-xl backdrop-blur-md"
                            style={{ background: theme.bgCard }}
                        >
                            <div className="flex items-center gap-6">
                                <div className={`p-4 rounded-2xl ${s.bg} ${s.color}`}>
                                    <i className={`bx ${s.icon} text-3xl`} />
                                </div>
                                <div>
                                    <div className="text-4xl font-black tracking-tight" style={{ color: theme.text }}>{s.value}</div>
                                    <div className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: theme.text }}>{s.label}</div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Filters Row */}
                <div className="p-4 rounded-3xl border border-white/5 mb-6 flex flex-wrap gap-4 items-center" style={{ background: theme.bgCard }}>
                    <div className="relative flex-1 min-w-[240px]">
                        <i className="bx bx-search absolute left-5 top-1/2 -translate-y-1/2 opacity-30 text-xl" style={{ color: theme.text }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Filter by target..."
                            className="w-full pl-14 pr-6 py-4 rounded-2xl outline-none transition-all font-bold"
                            style={{ color: theme.text, background: theme.badgeBg, border: `1px solid ${theme.border}` }}
                        />
                    </div>

                    <select
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="p-4 rounded-2xl outline-none font-bold text-sm"
                        style={{ color: theme.text, background: theme.badgeBg, border: `1px solid ${theme.border}` }}
                    >
                        <option value="all">All Status</option>
                        <option value="threat">Threats</option>
                        <option value="safe">Safe</option>
                    </select>

                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="p-4 rounded-2xl outline-none font-bold text-sm"
                        style={{ color: theme.text, background: theme.badgeBg, border: `1px solid ${theme.border}` }}
                    >
                        <option value="all">All Types</option>
                        <option value="url">URL</option>
                        <option value="email">Email</option>
                        <option value="apk">APK</option>
                        <option value="file">PDF</option>
                        <option value="image">Image</option>
                    </select>

                    <button
                        onClick={handleClearAll}
                        className="p-4 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all duration-300 group"
                    >
                        <i className="bx bx-trash text-xl group-hover:scale-110 transition-transform" />
                    </button>
                </div>

                {/* Table Area */}
                <div className="rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl" style={{ background: theme.bgCard }}>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-white/5">
                                    {['Type', t('tools.checkers.target_col'), 'Status', 'Confidence', t('tools.checkers.time_col'), ''].map((h, i) => (
                                        <th key={i} className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] opacity-40" style={{ color: theme.text }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                <AnimatePresence mode="popLayout">
                                    {filtered.length === 0 ? (
                                        <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                            <td colSpan={6} className="py-32 text-center opacity-20">
                                                <i className="bx bx-data text-6xl mb-4 block" />
                                                <span className="font-black uppercase tracking-widest text-xs">{t('tools.checkers.no_records')}</span>
                                            </td>
                                        </motion.tr>
                                    ) : filtered.map((item, idx) => {
                                        const isThreat = ['phishing', 'malware', 'Dangerous', 'Malicious'].includes(item.result);
                                        return (
                                            <motion.tr
                                                key={item.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="group hover:bg-white/[0.02] transition-colors"
                                            >
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                                            <i className={`bx ${item.icon || 'bx-cube'} text-lg opacity-60`} style={{ color: theme.text }} />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase opacity-60" style={{ color: theme.text }}>{item.type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="max-w-[300px] truncate font-bold text-sm" style={{ color: theme.text }}>{item.target}</div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${isThreat ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                                                        {item.result}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="text-sm font-black font-mono opacity-80" style={{ color: theme.text }}>{parseFloat(item.confidence || 0).toFixed(1)}%</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-[11px] font-bold opacity-40 font-mono" style={{ color: theme.text }}>
                                                        {(() => {
                                                            const ts = (item.time || '').replace(' ', 'T');
                                                            const d = new Date(ts);
                                                            return isNaN(d.getTime()) ? 'N/A' : (
                                                                <>
                                                                    {d.toLocaleDateString()}<br />
                                                                    {d.toLocaleTimeString()}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-3 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                        style={{ color: theme.text }}
                                                    >
                                                        <i className="bx bx-x text-xl" />
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScanHistory;
