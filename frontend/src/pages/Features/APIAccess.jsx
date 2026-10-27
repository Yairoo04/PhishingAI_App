import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const API_BASE = 'https://phd.infoseclab.id.vn';
const ACCENT = '#3b82f6'; // blue-500
const ACCENT2 = '#60a5fa'; // blue-400
const ACCENT_DIM = 'rgba(59,130,246,0.15)';

/* ── tiny helpers ───────────────────────────────────────────────── */
const Badge = ({ method }) => {
    const colors = {
        POST: { bg: 'rgba(59,130,246,0.15)', fg: '#60a5fa' },
        GET: { bg: 'rgba(16,185,129,0.15)', fg: '#34d399' },
        DEL: { bg: 'rgba(239,68,68,0.15)', fg: '#f87171' },
    };
    const c = colors[method] || colors.GET;
    return (
        <span style={{
            fontSize: '10px', padding: '3px 8px',
            background: c.bg, color: c.fg,
            borderRadius: '4px', fontWeight: 800, letterSpacing: '0.5px',
            fontFamily: 'monospace', flexShrink: 0,
        }}>
            {method}
        </span>
    );
};

const StatCard = ({ label, value, sub, accent }) => (
    <div style={{
        background: 'rgba(59,130,246,0.06)',
        border: `1px solid rgba(59,130,246,0.2)`,
        borderRadius: '12px', padding: '20px', flex: 1, minWidth: '120px',
    }}>
        <div style={{ fontSize: '24px', fontWeight: 800, color: accent || ACCENT }}>{value}</div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginTop: '2px' }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{sub}</div>}
    </div>
);

/* ── main component ─────────────────────────────────────────────── */
const APIAccess = () => {
    const { t } = useTranslation();
    const { theme, darkMode } = useTheme();

    const [apiKey, setApiKey] = useState('');
    const [copied, setCopied] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [usageToday, setUsageToday] = useState(0);
    const [usageLimit] = useState(10);
    const [loadingUsage, setLoadingUsage] = useState(false);
    const [genError, setGenError] = useState('');
    const [testUrl, setTestUrl] = useState('https://suspicious-site.com');
    const [testResult, setTestResult] = useState(null);
    const [testing, setTesting] = useState(false);
    const [activeTab, setActiveTab] = useState('python');

    /* ── fetch or restore key from localStorage ─────────────────── */
    useEffect(() => {
        const saved = localStorage.getItem('phishguard_api_key');
        if (saved) {
            setApiKey(saved);
            fetchUsage(saved);
        }
    }, []);

    const fetchUsage = useCallback(async (key) => {
        if (!key) return;
        setLoadingUsage(true);
        try {
            const res = await fetch(`${API_BASE}/api/apikey/usage`, {
                headers: { 'X-API-Key': key },
            });
            if (res.ok) {
                const data = await res.json();
                setUsageToday(data.used_today ?? 0);
            }
        } catch (e) {
            console.error('Failed to fetch usage:', e);
        } finally {
            setLoadingUsage(false);
        }
    }, []);

    /* ── generate API key ───────────────────────────────────────── */
    const handleGenerate = async () => {
        setGenerating(true);
        setGenError('');
        try {
            const res = await fetch(`${API_BASE}/api/apikey/generate`, { method: 'POST' });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();
            const key = data.api_key;
            setApiKey(key);
            localStorage.setItem('phishguard_api_key', key);
            setUsageToday(0);
        } catch (e) {
            setGenError('Không thể tạo API key. Vui lòng thử lại.');
            console.error(e);
        } finally {
            setGenerating(false);
        }
    };

    /* ── copy key ───────────────────────────────────────────────── */
    const handleCopy = async () => {
        if (!apiKey) return;
        try {
            await navigator.clipboard.writeText(apiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* fallback */
            const el = document.createElement('textarea');
            el.value = apiKey;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    /* ── live API test ──────────────────────────────────────────── */
    const handleTest = async () => {
        if (!apiKey) { setGenError('Vui lòng tạo API key trước.'); return; }
        if (usageToday >= usageLimit) {
            setTestResult({ error: 'Đã đạt giới hạn 10 lượt/ngày. Thử lại vào ngày mai.' });
            return;
        }
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch(`${API_BASE}/api/apikey/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
                body: JSON.stringify({ url: testUrl }),
            });
            const data = await res.json();
            setTestResult(data);
            if (res.ok) setUsageToday(u => u + 1);
        } catch (e) {
            setTestResult({ error: String(e) });
        } finally {
            setTesting(false);
        }
    };

    /* ── code snippets ──────────────────────────────────────────── */
    const snippets = {
        python: `import requests

url     = "${API_BASE}/api/apikey/scan"
payload = {"url": "http://suspicious-site.com"}
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "${apiKey || 'YOUR_API_KEY'}"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,

        javascript: `const res = await fetch("${API_BASE}/api/apikey/scan", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "${apiKey || 'YOUR_API_KEY'}"
  },
  body: JSON.stringify({ url: "http://suspicious-site.com" })
});
const data = await res.json();
console.log(data);`,

        curl: `curl -X POST ${API_BASE}/api/apikey/scan \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  -d '{"url": "http://suspicious-site.com"}'`,
    };

    const endpoints = [
        { method: 'POST', path: '/api/apikey/generate', desc: t('features.api.desc_generate') },
        { method: 'POST', path: '/api/apikey/scan', desc: t('features.api.desc_scan') },
        { method: 'GET', path: '/api/apikey/usage', desc: t('features.api.desc_usage') },
    ];

    const usagePct = Math.min((usageToday / usageLimit) * 100, 100);
    const barColor = usagePct >= 90 ? '#ef4444' : usagePct >= 60 ? '#f59e0b' : ACCENT;

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, paddingTop: '80px', paddingBottom: '60px' }}>
            <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '0 24px' }}>

                {/* ── Header ─────────────────────────────────────────────── */}
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ width: '3px', height: '20px', background: ACCENT, borderRadius: '2px' }} />
                        <span style={{ color: ACCENT2, fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
                            {t('features.api.portal')}
                        </span>
                    </div>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, color: theme.text, margin: 0 }}>
                        {t('features.api.title')}{' '}
                        <span style={{
                            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            {t('features.api.title_hl')}
                        </span>
                    </h1>
                    <p style={{ color: theme.textMuted, fontSize: '13px', marginTop: '6px' }}>
                        {t('features.api.desc')} — {t('features.api.limit_note')}
                    </p>
                </div>

                {/* ── Stats row ──────────────────────────────────────────── */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <StatCard label={t('features.api.stat_status')} value={apiKey ? t('features.api.stat_active') : t('features.api.stat_none')} sub={apiKey ? apiKey.slice(0, 18) + '…' : t('features.api.stat_hint')} accent={apiKey ? '#34d399' : '#94a3b8'} />
                    <StatCard label={t('features.api.stat_used')} value={loadingUsage ? '…' : `${usageToday}/${usageLimit}`} sub={t('features.api.stat_reset')} />
                    <StatCard label={t('features.api.stat_remain')} value={loadingUsage ? '…' : Math.max(0, usageLimit - usageToday)} sub={t('features.api.stat_remain_sub')} accent={usageToday >= usageLimit ? '#ef4444' : ACCENT} />
                    <StatCard label={t('features.api.stat_version')} value="v1" sub="RESTful JSON" accent={ACCENT2} />
                </div>

                {/* ── API Key card ───────────────────────────────────────── */}
                <div style={{
                    background: theme.bgCard, border: `1px solid rgba(59,130,246,0.25)`,
                    borderRadius: '16px', padding: '28px', marginBottom: '24px',
                    boxShadow: '0 4px 24px rgba(59,130,246,0.08)',
                }}>
                    <h3 style={{ color: theme.text, fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
                        {t('features.api.your_key')}
                    </h3>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {/* Key display */}
                        <div style={{
                            flex: 1, minWidth: '200px',
                            background: theme.badgeBg || 'rgba(15,23,42,0.6)',
                            border: `1px solid ${apiKey ? 'rgba(59,130,246,0.4)' : theme.border}`,
                            borderRadius: '8px', padding: '13px 16px',
                            fontFamily: 'monospace', color: apiKey ? ACCENT2 : '#64748b',
                            fontSize: '13px', letterSpacing: '0.5px',
                            transition: 'border-color 0.3s',
                            wordBreak: 'break-all',
                        }}>
                            {apiKey || t('features.api.key_placeholder')}
                        </div>

                        {/* Copy button */}
                        <button
                            onClick={handleCopy}
                            disabled={!apiKey}
                            style={{
                                padding: '0 20px', borderRadius: '8px',
                                background: copied ? '#10b981' : (apiKey ? ACCENT : '#334155'),
                                color: '#fff', border: 'none', fontWeight: 600,
                                cursor: apiKey ? 'pointer' : 'not-allowed',
                                transition: 'background 0.25s', whiteSpace: 'nowrap',
                                display: 'flex', alignItems: 'center', gap: '6px',
                            }}
                        >
                            {copied ? t('features.api.copied') : t('features.api.copy')}
                        </button>

                        {/* Generate button */}
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            style={{
                                padding: '0 20px', borderRadius: '8px',
                                background: generating
                                    ? '#1e40af'
                                    : `linear-gradient(135deg, ${ACCENT}, #2563eb)`,
                                color: '#fff', border: 'none', fontWeight: 700,
                                cursor: generating ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                whiteSpace: 'nowrap',
                                boxShadow: generating ? 'none' : '0 4px 14px rgba(59,130,246,0.4)',
                                transition: 'all 0.25s',
                            }}
                        >
                            {generating ? t('features.api.generating') : (apiKey ? t('features.api.regenerate') : t('features.api.generate'))}
                        </button>
                    </div>

                    {/* Error */}
                    {genError && (
                        <div style={{ marginTop: '12px', color: '#f87171', fontSize: '13px' }}>
                            {genError}
                        </div>
                    )}

                    {/* Usage progress bar */}
                    {apiKey && (
                        <div style={{ marginTop: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>{t('features.api.usage_today')}</span>
                                <span style={{ fontSize: '12px', color: barColor, fontWeight: 700 }}>
                                    {usageToday} / {usageLimit}
                                </span>
                            </div>
                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', width: `${usagePct}%`,
                                    background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                                    borderRadius: '99px', transition: 'width 0.5s ease',
                                }} />
                            </div>
                            {usageToday >= usageLimit && (
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#f87171' }}>
                                    {t('features.api.limit_reached')}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── 2-column: Code + Endpoints ─────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>

                    {/* Code examples */}
                    <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px', overflow: 'hidden' }}>
                        <h4 style={{ color: theme.text, fontWeight: 700, marginBottom: '16px' }}>
                            {t('features.api.quick_start')}
                        </h4>

                        {/* Tab selector */}
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px' }}>
                            {['python', 'javascript', 'curl'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        flex: 1, padding: '6px 0', borderRadius: '6px', border: 'none',
                                        background: activeTab === tab ? ACCENT : 'transparent',
                                        color: activeTab === tab ? '#fff' : '#94a3b8',
                                        fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        <pre style={{
                            background: '#0f172a', color: '#e2e8f0',
                            padding: '16px', borderRadius: '10px',
                            fontSize: '11.5px', overflowX: 'auto',
                            margin: 0, lineHeight: '1.6',
                            border: '1px solid rgba(59,130,246,0.2)',
                        }}>
                            <code>{snippets[activeTab]}</code>
                        </pre>
                    </div>

                    {/* Endpoints */}
                    <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px' }}>
                        <h4 style={{ color: theme.text, fontWeight: 700, marginBottom: '16px' }}>
                            {t('features.api.endpoints')}
                        </h4>
                        {endpoints.map((e, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'flex-start', gap: '12px',
                                padding: '14px 0',
                                borderBottom: i < endpoints.length - 1 ? `1px solid ${theme.border}` : 'none',
                            }}>
                                <Badge method={e.method} />
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        color: darkMode ? ACCENT2 : '#1d4ed8',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        fontFamily: 'monospace',
                                        marginBottom: '4px',
                                    }}>
                                        {e.path}
                                    </div>
                                    <div style={{ color: theme.textMuted, fontSize: '13px', fontWeight: 500 }}>{e.desc}</div>
                                </div>
                            </div>
                        ))}

                        {/* Rate limit info box */}
                        <div style={{
                            marginTop: '16px', padding: '14px',
                            background: ACCENT_DIM,
                            border: `1px solid rgba(59,130,246,0.3)`,
                            borderRadius: '10px',
                        }}>
                            <div style={{ color: darkMode ? ACCENT2 : '#1d4ed8', fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
                                {t('features.api.policy_title')}
                            </div>
                            <div style={{ color: theme.textMuted, fontSize: '13px', lineHeight: '1.7' }}>
                                • <strong style={{ color: theme.text }}>{t('features.api.policy_1')}</strong><br />
                                • {t('features.api.policy_2')} <code style={{ color: darkMode ? ACCENT2 : '#1d4ed8', background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(59,130,246,0.1)', padding: '1px 6px', borderRadius: '3px' }}>X-API-Key</code><br />
                                • {t('features.api.policy_3')}<br />
                                • {t('features.api.policy_4')} <code style={{ color: '#ef4444', background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(239,68,68,0.08)', padding: '1px 6px', borderRadius: '3px' }}>HTTP 429</code>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Live API tester ─────────────────────────────────────── */}
                <div style={{
                    background: theme.bgCard, border: `1px solid rgba(59,130,246,0.25)`,
                    borderRadius: '16px', padding: '28px',
                    boxShadow: '0 4px 24px rgba(59,130,246,0.06)',
                }}>
                    <h4 style={{ color: theme.text, fontWeight: 700, marginBottom: '6px' }}>
                        {t('features.api.tester_title')}
                    </h4>
                    <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '20px' }}>
                        {t('features.api.tester_desc')}
                    </p>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        <input
                            type="text"
                            value={testUrl}
                            onChange={e => setTestUrl(e.target.value)}
                            placeholder="https://suspicious-site.com"
                            style={{
                                flex: 1, minWidth: '200px', padding: '12px 16px',
                                borderRadius: '8px', border: `1px solid ${theme.inputBorder || theme.border}`,
                                background: theme.bgInput || 'rgba(255,255,255,0.05)',
                                color: theme.text, outline: 'none', fontSize: '13px',
                            }}
                        />
                        <button
                            onClick={handleTest}
                            disabled={testing || !apiKey || usageToday >= usageLimit}
                            style={{
                                padding: '12px 28px', borderRadius: '8px', border: 'none',
                                background: (testing || !apiKey || usageToday >= usageLimit)
                                    ? '#334155'
                                    : `linear-gradient(135deg, ${ACCENT}, #2563eb)`,
                                color: '#fff', fontWeight: 700, cursor:
                                    (testing || !apiKey || usageToday >= usageLimit) ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                boxShadow: (!testing && apiKey && usageToday < usageLimit)
                                    ? '0 4px 14px rgba(59,130,246,0.4)' : 'none',
                                transition: 'all 0.25s',
                            }}
                        >
                            {testing ? t('features.api.testing') : t('features.api.test_btn')}
                        </button>
                    </div>

                    {!apiKey && (
                        <div style={{ color: '#f59e0b', fontSize: '12px', marginBottom: '10px' }}>
                            {t('features.api.need_key')}
                        </div>
                    )}

                    {/* Result */}
                    {testResult && (
                        <div style={{ marginTop: '8px' }}>
                            {testResult.error ? (
                                <div style={{
                                    padding: '14px', borderRadius: '10px',
                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                    color: '#f87171', fontSize: '13px',
                                }}>
                                    {testResult.error}
                                </div>
                            ) : (
                                <div>
                                    <div style={{
                                        padding: '12px 16px', borderRadius: '10px', marginBottom: '12px',
                                        background: testResult.prediction === 'phishing'
                                            ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                        border: `1px solid ${testResult.prediction === 'phishing' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                    }}>
                                        <div>
                                            <div style={{
                                                fontWeight: 700, fontSize: '14px',
                                                color: testResult.prediction === 'phishing' ? '#f87171' : '#34d399',
                                            }}>
                                                {testResult.prediction === 'phishing' ? t('features.api.result_phishing') : t('features.api.result_legit')}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                {t('features.api.result_prob')}: {testResult.phishing_probability ?? '–'}%
                                                {testResult.message && ` · ${testResult.message}`}
                                            </div>
                                        </div>
                                        <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#64748b' }}>
                                            {t('features.api.result_remain')}: {Math.max(0, usageLimit - usageToday)}
                                        </div>
                                    </div>

                                    <pre style={{
                                        background: '#0f172a', color: '#94a3b8',
                                        padding: '14px', borderRadius: '10px', fontSize: '11px',
                                        overflowX: 'auto', margin: 0,
                                        border: '1px solid rgba(59,130,246,0.15)',
                                        maxHeight: '180px', overflowY: 'auto',
                                    }}>
                                        {JSON.stringify(testResult, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @media (max-width: 640px) {
                    div[style*="grid-template-columns: 1fr 1fr"] {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default APIAccess;

