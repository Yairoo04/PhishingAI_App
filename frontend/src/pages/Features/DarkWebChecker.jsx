import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { fetchWithFailover } from '../../utils/apiClient';

const DarkWebChecker = () => {
    const { t } = useTranslation();
    const { theme } = useTheme();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);   // { found, breaches, sources, years }
    const [error, setError] = useState('');

    const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

    const handleCheck = async () => {
        setError('');
        setResult(null);

        if (!email.trim()) {
            setError('Vui lòng nhập địa chỉ email.');
            return;
        }
        if (!isValidEmail(email)) {
            setError('Email không hợp lệ. Vui lòng kiểm tra lại.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetchWithFailover('/api/darkweb/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Server error ${res.status}`);
            }

            const data = await res.json();
            // Expected: { found: bool, breaches: number, sources: string[], years: number[] }
            setResult(data);
        } catch (err) {
            setError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
            console.error('[DarkWebChecker]', err);
        } finally {
            setLoading(false);
        }
    };

    // ── Enter key support ──────────────────────────────────
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleCheck();
    };

    // ── Reset ──────────────────────────────────────────────
    const handleReset = () => {
        setEmail('');
        setResult(null);
        setError('');
    };

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, paddingTop: '80px', paddingBottom: '60px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>

                {/* ── Header ───────────────────────────────── */}
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <div style={{ width: '3px', height: '20px', background: '#ec4899', borderRadius: '2px' }} />
                        <span style={{ color: '#ec4899', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
                            {t('features.darkweb.badge')}
                        </span>
                    </div>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, color: theme.text, margin: 0 }}>
                        {t('features.darkweb.title')}{' '}
                        <span style={{ color: '#ec4899' }}>{t('features.darkweb.title_hl')}</span>
                    </h1>
                    <p style={{ color: theme.textMuted, fontSize: '13px', marginTop: '4px' }}>
                        {t('features.darkweb.desc')}
                    </p>
                </div>

                {/* ── Main card ────────────────────────────── */}
                <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '20px', padding: '40px' }}>

                    {/* Email input */}
                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                        <i className="bx bx-envelope" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: theme.textFaint, fontSize: '20px' }} />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(''); setResult(null); }}
                            onKeyDown={handleKeyDown}
                            placeholder={t('features.darkweb.placeholder')}
                            disabled={loading}
                            style={{
                                width: '100%', padding: '16px 16px 16px 48px', borderRadius: '12px',
                                background: theme.bgInput, border: `1px solid ${error ? '#ef4444' : theme.inputBorder}`,
                                color: theme.text, fontSize: '16px', outline: 'none',
                                boxSizing: 'border-box', transition: 'border-color 0.2s',
                            }}
                        />
                    </div>

                    {/* Validation / API error */}
                    {error && (
                        <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '13px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="bx bx-error-circle" />
                            {error}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={handleCheck}
                            disabled={loading}
                            style={{ flex: 1, padding: '16px', borderRadius: '12px', background: loading ? '#9d3d6e' : '#ec4899', color: '#fff', border: 'none', fontWeight: 700, fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(236,72,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            {loading && <i className="bx bx-loader-alt" style={{ animation: 'spin 1s linear infinite' }} />}
                            {loading ? t('features.darkweb.checking') : t('features.darkweb.check_btn')}
                        </button>
                        {result && (
                            <button
                                onClick={handleReset}
                                style={{ padding: '16px 20px', borderRadius: '12px', background: 'transparent', color: theme.textDim, border: `1px solid ${theme.border}`, fontWeight: 600, cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* ── Result: BREACHED ─────────────────────── */}
                    {result && result.found && (
                        <div style={{ marginTop: '28px', padding: '24px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', textAlign: 'left' }}>
                            {/* Alert header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                <i className="bx bxs-error-circle" style={{ color: '#ef4444', fontSize: '24px', flexShrink: 0 }} />
                                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '15px' }}>
                                    ⚠ Email này đã bị rò rỉ trong{' '}
                                    <span style={{ fontSize: '20px' }}>{result.breaches}</span>{' '}
                                    vụ vi phạm dữ liệu.
                                </span>
                            </div>

                            {/* Source badges */}
                            {result.sources && result.sources.length > 0 && (
                                <div style={{ marginBottom: '12px' }}>
                                    <p style={{ color: 'rgba(239,68,68,0.7)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                                        Nguồn rò rỉ
                                    </p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {result.sources.map((src, i) => (
                                            <span key={i} style={{ padding: '5px 14px', borderRadius: '999px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '12px', fontWeight: 700, border: '1px solid rgba(239,68,68,0.35)' }}>
                                                {src}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Years */}
                            {result.years && result.years.length > 0 && (
                                <div>
                                    <p style={{ color: 'rgba(239,68,68,0.7)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                                        Năm xảy ra
                                    </p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {result.years.map((yr, i) => (
                                            <span key={i} style={{ padding: '5px 14px', borderRadius: '999px', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.85)', fontSize: '12px', fontWeight: 600, border: '1px solid rgba(239,68,68,0.2)' }}>
                                                {yr}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recommendation */}
                            <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: 'rgba(239,68,68,0.06)', borderLeft: '3px solid #ef4444' }}>
                                <p style={{ color: theme.textMuted, fontSize: '12px', margin: 0 }}>
                                    💡 <strong>Khuyến nghị:</strong> Đổi mật khẩu ngay lập tức và bật xác thực hai yếu tố (2FA) cho các dịch vụ liên quan.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── Result: SAFE ──────────────────────── */}
                    {result && !result.found && (
                        <div style={{ marginTop: '28px', padding: '24px', borderRadius: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <i className="bx bxs-check-shield" style={{ color: '#10b981', fontSize: '36px', flexShrink: 0 }} />
                            <div>
                                <div style={{ color: '#10b981', fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>
                                    {t('features.darkweb.safe_title')}
                                </div>
                                <div style={{ color: theme.textDim, fontSize: '12px' }}>
                                    {t('features.darkweb.safe_desc')}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Statistics */}
                    <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center', gap: '24px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: theme.text, fontWeight: 700, fontSize: '20px' }}>500k+</div>
                            <div style={{ color: theme.textDim, fontSize: '11px' }}>{t('features.darkweb.stat_1')}</div>
                        </div>
                        <div style={{ width: '1px', background: theme.border }} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: theme.text, fontWeight: 700, fontSize: '20px' }}>24/7</div>
                            <div style={{ color: theme.textDim, fontSize: '11px' }}>{t('features.darkweb.stat_2')}</div>
                        </div>
                    </div>
                </div>

                {/* ── Privacy note ─────────────────────────── */}
                <div style={{ marginTop: '40px', textAlign: 'left', background: 'rgba(236,72,153,0.05)', border: '1px solid rgba(236,72,153,0.15)', borderRadius: '12px', padding: '24px' }}>
                    <h4 style={{ color: '#ec4899', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="bx bx-shield-quarter" /> {t('features.darkweb.privacy_title')}
                    </h4>
                    <p style={{ color: theme.textMuted, fontSize: '13px', lineHeight: 1.6 }}>
                        {t('features.darkweb.privacy_desc')}
                    </p>
                </div>
            </div>

            {/* Spinner keyframe */}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default DarkWebChecker;
