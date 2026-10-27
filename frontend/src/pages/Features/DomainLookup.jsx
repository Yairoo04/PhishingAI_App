import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const DomainLookup = () => {
    const { t } = useTranslation();
    const { theme, darkMode } = useTheme();
    const [domain, setDomain] = useState('');
    const [result, setResult] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async () => {
        if (!domain) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/domain/lookup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ domain: domain })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to lookup domain');
            }

            setResult(data);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, paddingTop: '80px', paddingBottom: '60px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px' }}>
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ width: '3px', height: '20px', background: '#14b8a6', borderRadius: '2px' }} />
                        <span style={{ color: '#14b8a6', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('features.domain.badge')}</span>
                    </div>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, color: theme.text, margin: 0 }}>{t('features.domain.title')} <span style={{ color: '#14b8a6' }}>{t('features.domain.title_hl')}</span></h1>
                    <p style={{ color: theme.textMuted, fontSize: '13px', marginTop: '4px' }}>{t('features.domain.desc')}</p>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                    <input
                        type="text"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        placeholder={t('features.domain.placeholder')}
                        style={{ flex: 1, padding: '14px 20px', borderRadius: '8px', background: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.text, outline: 'none' }}
                    />
                    <button onClick={handleSearch} disabled={loading} style={{ padding: '0 32px', borderRadius: '8px', background: loading ? theme.bgCard : '#14b8a6', color: loading ? theme.textMuted : '#fff', border: 'none', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                        {loading ? <i className="bx bx-loader-alt bx-spin" /> : t('features.domain.lookup')}
                    </button>
                </div>

                {error && (
                    <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', color: '#ef4444', borderRadius: '8px', marginBottom: '32px' }}>
                        <i className="bx bx-error-circle" style={{ marginRight: '8px' }} />
                        {error}
                    </div>
                )}

                {result && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '24px' }}>
                                <h3 style={{ color: theme.text, fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="bx bx-info-circle" style={{ color: '#14b8a6' }} /> {t('features.domain.whois')}
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {[
                                        { label: 'Registrar', value: result.whois.registrar },
                                        { label: 'Creation Date', value: result.whois.created },
                                        { label: 'Expiration Date', value: result.whois.expires },
                                        { label: 'Status', value: result.whois.status },
                                    ].map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: theme.textDim, fontSize: '13px' }}>{item.label}</span>
                                            <span style={{ color: theme.textSub, fontSize: '13px', fontWeight: 600, textAlign: 'right' }}>{item.value || 'N/A'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '24px' }}>
                                <h3 style={{ color: theme.text, fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="bx bx-radar" style={{ color: '#14b8a6' }} /> Risk Analysis
                                </h3>

                                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                    <div style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        width: '80px', height: '80px', borderRadius: '50%',
                                        background: result.risk_score > 60 ? 'rgba(239,68,68,0.1)' : result.risk_score > 30 ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                                        color: result.risk_score > 60 ? '#ef4444' : result.risk_score > 30 ? '#f59e0b' : '#22c55e',
                                        fontSize: '32px', fontWeight: 900
                                    }}>
                                        {result.risk_score}
                                    </div>
                                    <div style={{ marginTop: '12px', fontWeight: 700, color: theme.text, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        {result.risk_level || (result.risk_score > 60 ? 'High Risk' : result.risk_score > 30 ? 'Suspicious' : 'Safe')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                            <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '24px' }}>
                                <h3 style={{ color: theme.text, fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="bx bx-globe" style={{ color: '#14b8a6' }} /> {t('features.domain.ip_loc')}
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {[
                                        { label: 'IP Address', value: result.ip.address },
                                        { label: 'Organization', value: result.ip.organization },
                                        { label: 'ASN', value: result.ip.asn },
                                        { label: 'Location', value: result.ip.city ? `${result.ip.city}, ${result.ip.country}` : result.ip.country },
                                    ].map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: theme.textDim, fontSize: '13px' }}>{item.label}</span>
                                            <span style={{ color: theme.textSub, fontSize: '13px', fontWeight: 600, textAlign: 'right' }}>{item.value || 'N/A'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '24px' }}>
                                <h3 style={{ color: theme.text, fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="bx bx-server" style={{ color: '#14b8a6' }} /> DNS Records
                                </h3>
                                {Object.entries(result.dns).map(([k, v]) => (
                                    <div key={k} style={{ marginBottom: '16px' }}>
                                        <span style={{ color: theme.textDim, fontSize: '13px', display: 'block', marginBottom: '4px' }}>{k} Records</span>
                                        {v && v.length > 0 ? (
                                            v.map((record, i) => (
                                                <div key={i} style={{ color: theme.textSub, fontSize: '12px', fontFamily: 'monospace', background: 'rgba(0,0,0,0.1)', padding: '4px 8px', borderRadius: '4px', marginBottom: '4px', wordBreak: 'break-all' }}>
                                                    {record}
                                                </div>
                                            ))
                                        ) : (
                                            <span style={{ color: theme.textFaint, fontSize: '12px' }}>None</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div >
        </div >
    );
};

export default DomainLookup;
