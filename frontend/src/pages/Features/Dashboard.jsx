import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { fetchDashboardStats } from '../../utils/historyManager';

const CHART_DATA_MOCK = [45, 72, 38, 91, 65, 55, 80, 43, 67, 88, 74, 62, 95, 58, 70, 83, 49, 76, 90, 64, 81, 57, 73, 86, 51, 68, 77, 92, 60, 84];

const rStyle = {
    phishing: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
    malware: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' },
    legitimate: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' },
    Dangerous: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
    Safe: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' }
};

const Dashboard = () => {
    const { t } = useTranslation();
    const { theme, darkMode } = useTheme();
    const [stats, setStats] = useState({ totalScans: 0, threatsBlocked: 0, safeUrls: 0, accuracy: 98.7 });
    const [recentScans, setRecentScans] = useState([]);
    const [threatBreakdown, setThreatBreakdown] = useState([]);
    const [time, setTime] = useState(new Date());

    const updateDashboardData = async () => {
        try {
            const data = await fetchDashboardStats();

            setStats({
                totalScans: data.total_scans,
                threatsBlocked: data.threats_blocked,
                safeUrls: data.safe_confirmed,
                accuracy: data.accuracy
            });

            setRecentScans(data.recent_scans.slice(0, 6));

            const dist = data.threat_distribution;
            const total = data.total_scans || 1;

            const breakdown = [
                { label: 'URL Phishing', key: 'url_phishing', type: 'url', color: '#ef4444' },
                { label: 'Email Scam', key: 'email_scam', type: 'email', color: '#f97316' },
                { label: 'Android Malware', key: 'android_malware', type: 'apk', color: '#f59e0b' },
                { label: 'PDF Exploit', key: 'pdf_exploit', type: 'file', color: '#eab308' },
                { label: 'Image/QR', key: 'image_qr', type: 'image', color: '#84cc16' },
            ].map(item => ({
                ...item,
                pct: Math.round((dist[item.key] / total) * 100) || 0
            }));

            setThreatBreakdown(breakdown);
        } catch (error) {
            console.error("Dashboard failed to fetch stats", error);
        }
    };

    useEffect(() => {
        updateDashboardData();
        const clock = setInterval(() => setTime(new Date()), 1000);

        window.addEventListener('scanHistoryUpdated', updateDashboardData);

        return () => {
            clearInterval(clock);
            window.removeEventListener('scanHistoryUpdated', updateDashboardData);
        };
    }, []);

    const formatTime = (isoString) => {
        try {
            if (!isoString) return 'recently';
            // Replace space with T for cross-browser compatibility if it's a raw sqlite timestamp
            const normalized = isoString.includes(' ') && !isoString.includes('T')
                ? isoString.replace(' ', 'T')
                : isoString;
            const date = new Date(normalized);
            if (isNaN(date.getTime())) return 'recently';

            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
            return date.toLocaleDateString();
        } catch (e) { return 'recently'; }
    };

    const cardStyle = {
        background: theme.bgCard,
        border: `1px solid ${theme.border}`,
        borderRadius: '6px',
        boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
    };

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, paddingTop: '80px', paddingBottom: '60px', transition: 'background 0.3s' }}>
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${theme.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridLine} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-7">
                    <div>
                        <div className="flex items-center gap-2.5 mb-2">
                            <div style={{ width: '3px', height: '20px', background: '#3b82f6', borderRadius: '2px' }} />
                            <span style={{ color: '#3b82f6', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('features.dashboard.badge')}</span>
                        </div>
                        <h1 style={{ fontSize: '32px', fontWeight: 800, color: theme.text, margin: 0 }}>{t('features.dashboard.title')} <span style={{ color: '#3b82f6' }}>{t('features.dashboard.title_hl')}</span></h1>
                        <p style={{ color: theme.textMuted, fontSize: '13px', marginTop: '4px' }}>{t('features.dashboard.desc')}</p>
                    </div>
                    <div style={{ ...cardStyle, border: '1px solid rgba(59,130,246,0.2)', padding: '12px 18px', textAlign: 'right', fontFamily: 'monospace' }}>
                        <div style={{ color: '#3b82f6', fontSize: '10px', letterSpacing: '1px', marginBottom: '4px' }}>{t('features.dashboard.sys_time')}</div>
                        <div style={{ color: theme.text, fontSize: '24px', fontWeight: 700 }}>{time.toLocaleTimeString()}</div>
                        <div style={{ color: theme.textFaint, fontSize: '10px', marginTop: '2px' }}>{time.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                    </div>
                </div>

                {/* Stats Cards - Responsive */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-5">
                    {[
                        { icon: 'bx-search-alt', label: t('features.dashboard.total_scans'), value: stats.totalScans.toLocaleString(), rgb: '59,130,246' },
                        { icon: 'bx-shield-x', label: t('features.dashboard.blocked'), value: stats.threatsBlocked.toLocaleString(), rgb: '239,68,68' },
                        { icon: 'bx-shield-check', label: t('features.dashboard.safe'), value: stats.safeUrls.toLocaleString(), rgb: '34,197,94' },
                        { icon: 'bx-bullseye', label: t('features.dashboard.accuracy'), value: `${stats.accuracy}%`, rgb: '245,158,11' },
                    ].map((s, i) => (
                        <div key={i} className="flex items-center gap-3 p-4 sm:p-5" style={cardStyle}>
                            <div className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 flex items-center justify-center rounded-md"
                                style={{ background: `rgba(${s.rgb},0.08)`, border: `1px solid rgba(${s.rgb},0.2)` }}>
                                <i className={`bx ${s.icon}`} style={{ color: `rgb(${s.rgb})`, fontSize: '20px' }} />
                            </div>
                            <div>
                                <div style={{ color: theme.text, fontWeight: 800, fontSize: '20px', lineHeight: 1 }}>{s.value}</div>
                                <div style={{ color: theme.textFaint, fontSize: '10px', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chart + Threat Breakdown - Responsive */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
                    <div className="lg:col-span-2" style={cardStyle}>
                        <div style={{ padding: '20px' }}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                <div>
                                    <div style={{ color: theme.text, fontWeight: 700, fontSize: '14px' }}>{t('features.dashboard.chart_title')}</div>
                                    <div style={{ color: theme.textFaint, fontSize: '11px', marginTop: '2px' }}>{t('features.dashboard.chart_sub')}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#ef4444', borderRadius: '1px' }} /> {t('features.dashboard.high_risk')}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#3b82f6', borderRadius: '1px' }} /> {t('features.dashboard.normal')}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '120px' }}>
                                {CHART_DATA_MOCK.map((val, i) => (
                                    <div key={i} style={{ flex: 1, height: `${val}%`, borderRadius: '2px 2px 0 0', background: val > 80 ? 'linear-gradient(to top, #ef4444, #f87171)' : 'linear-gradient(to top, #1e40af, #3b82f6)', transition: 'height 0.5s ease' }} />
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.textDim, fontSize: '10px', marginTop: '6px' }}>
                                <span>{t('features.dashboard.days_ago')}</span><span>{t('features.dashboard.today')}</span>
                            </div>
                        </div>
                    </div>

                    <div style={cardStyle}>
                        <div style={{ padding: '20px' }}>
                            <div style={{ color: theme.text, fontWeight: 700, fontSize: '14px', marginBottom: '16px' }}>{t('features.dashboard.breakdown')}</div>
                            {threatBreakdown.map((item, i) => (
                                <div key={i} style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                        <span style={{ color: theme.textSub }}>{item.label}</span>
                                        <span style={{ color: item.color, fontWeight: 700 }}>{item.pct}%</span>
                                    </div>
                                    <div style={{ height: '4px', background: theme.badgeBg, borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${item.pct}%`, background: item.color, borderRadius: '2px' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Scans Table */}
                <div style={{ ...cardStyle, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="bx bx-history" style={{ color: '#3b82f6', fontSize: '16px' }} />
                        <span style={{ color: theme.text, fontWeight: 700, fontSize: '13px' }}>{t('features.dashboard.recent')}</span>
                    </div>
                    {recentScans.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: theme.textFaint }}>
                            <i className="bx bx-info-circle" style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }} />
                            {t('features.dashboard.no_scans')}
                        </div>
                    ) : recentScans.map((scan, i) => {
                        const rs = rStyle[scan.result] || rStyle.legitimate;
                        return (
                            <div key={i} className="flex items-center gap-2.5 px-4 sm:px-5 py-2.5" style={{ borderBottom: `1px solid ${theme.tableBorder}` }}>
                                <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded" style={{ background: theme.badgeBg, border: `1px solid ${theme.border}` }}>
                                    <i className={`bx ${scan.icon || 'bx-search'}`} style={{ color: theme.textFaint, fontSize: '14px' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="truncate" style={{ color: theme.textSub, fontSize: '12px', fontWeight: 500 }}>{scan.target}</div>
                                    <div style={{ color: theme.textDim, fontSize: '10px' }}>{formatTime(scan.time)} - {parseFloat(scan.confidence || 0).toFixed(1)}%</div>
                                </div>
                                <span className="flex-shrink-0" style={{ fontSize: '9px', padding: '2px 8px', background: rs.bg, border: `1px solid ${rs.border}`, color: rs.color, borderRadius: '2px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {scan.result}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
