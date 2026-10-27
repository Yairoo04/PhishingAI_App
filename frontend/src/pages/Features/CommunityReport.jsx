import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

// Use relative path or dynamically resolve port
const API_BASE = 'https://phd.infoseclab.id.vn';

const CommunityReport = () => {
    const { t } = useTranslation();
    const { theme } = useTheme();

    // ── Form state ──────────────────────────────────────────
    const [url, setUrl] = useState('');
    const [type, setType] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // ── Report list state ───────────────────────────────────
    const [reports, setReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(true);

    // ── Load recent reports on mount ────────────────────────
    useEffect(() => {
        const fetchReports = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/community/recent`);
                if (!res.ok) throw new Error(`Server error: ${res.status}`);
                const data = await res.json();
                setReports(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('[CommunityReport] Failed to load reports:', err);
                setReports([]);
            } finally {
                setLoadingReports(false);
            }
        };
        fetchReports();
    }, []);

    // ── URL validation ──────────────────────────────────────
    const isValidUrl = (val) => {
        try {
            new URL(val.startsWith('http') ? val : `https://${val}`);
            return val.trim().length > 0;
        } catch {
            return false;
        }
    };

    // ── Submit handler ──────────────────────────────────────
    const handleSubmit = async () => {
        setSubmitError('');
        setSubmitSuccess(false);

        if (!url.trim()) {
            setSubmitError('Vui lòng nhập URL cần báo cáo.');
            return;
        }
        if (!isValidUrl(url)) {
            setSubmitError('URL không hợp lệ. Ví dụ: https://fake-site.com');
            return;
        }
        if (!description.trim()) {
            setSubmitError('Vui lòng mô tả chi tiết về mối đe dọa.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/community/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: url.trim(),
                    type: type || t('features.community.type_1'),
                    description: description.trim(),
                }),
            });

            if (!res.ok) throw new Error(`Server error: ${res.status}`);

            // Prepend new report to top of list
            const newReport = {
                url: url.trim(),
                type: type || t('features.community.type_1'),
                description: description.trim(),
                time: 'Vừa xong',
                isNew: true,
            };
            setReports((prev) => [newReport, ...prev]);

            // Clear form
            setUrl('');
            setType('');
            setDescription('');
            setSubmitSuccess(true);

            // Hide success message after 4s
            setTimeout(() => setSubmitSuccess(false), 4000);
        } catch (err) {
            setSubmitError('Không thể gửi báo cáo. Vui lòng thử lại sau.');
            console.error('[CommunityReport] Submit failed:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, paddingTop: '80px', paddingBottom: '60px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px' }}>

                {/* ── Header ───────────────────────────────── */}
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ width: '3px', height: '20px', background: '#f59e0b', borderRadius: '2px' }} />
                        <span style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
                            {t('features.community.badge')}
                        </span>
                    </div>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, color: theme.text, margin: 0 }}>
                        {t('features.community.title')} <span style={{ color: '#f59e0b' }}>{t('features.community.title_hl')}</span>
                    </h1>
                    <p style={{ color: theme.textMuted, fontSize: '13px', marginTop: '4px' }}>
                        {t('features.community.desc')}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* ── Left: Report form ─────────────────── */}
                    <div className="lg:col-span-3" style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '32px' }}>
                        <h3 style={{ color: theme.text, fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>
                            {t('features.community.report_new')}
                        </h3>

                        {/* URL input */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: theme.textDim, fontSize: '12px', marginBottom: '8px' }}>
                                {t('features.community.target')}
                            </label>
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => { setUrl(e.target.value); setSubmitError(''); }}
                                placeholder="https://..."
                                disabled={loading}
                                style={{ width: '100%', padding: '12px', borderRadius: '6px', background: theme.bgInput, border: `1px solid ${submitError && !url ? '#ef4444' : theme.inputBorder}`, color: theme.text, outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>

                        {/* Threat type select */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: theme.textDim, fontSize: '12px', marginBottom: '8px' }}>
                                {t('features.community.type')}
                            </label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                disabled={loading}
                                style={{ width: '100%', padding: '12px', borderRadius: '6px', background: theme.bgInput, border: `1px solid ${theme.inputBorder}`, color: theme.text, outline: 'none' }}
                            >
                                <option value={t('features.community.type_1')}>{t('features.community.type_1')}</option>
                                <option value={t('features.community.type_2')}>{t('features.community.type_2')}</option>
                                <option value={t('features.community.type_3')}>{t('features.community.type_3')}</option>
                                <option value={t('features.community.type_4')}>{t('features.community.type_4')}</option>
                            </select>
                        </div>

                        {/* Description textarea */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: theme.textDim, fontSize: '12px', marginBottom: '8px' }}>
                                {t('features.community.detail')}
                            </label>
                            <textarea
                                rows="4"
                                value={description}
                                onChange={(e) => { setDescription(e.target.value); setSubmitError(''); }}
                                disabled={loading}
                                style={{ width: '100%', padding: '12px', borderRadius: '6px', background: theme.bgInput, border: `1px solid ${theme.inputBorder}`, color: theme.text, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                            />
                        </div>

                        {/* Validation / API error */}
                        {submitError && (
                            <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="bx bx-error-circle" />
                                {submitError}
                            </div>
                        )}

                        {/* Success message */}
                        {submitSuccess && (
                            <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="bx bx-check-circle" />
                                Báo cáo đã được gửi thành công. Cảm ơn bạn!
                            </div>
                        )}

                        {/* Submit button */}
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            style={{ width: '100%', padding: '14px', borderRadius: '8px', background: loading ? '#a16207' : '#f59e0b', color: '#fff', border: 'none', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s' }}
                        >
                            {loading && <i className="bx bx-loader-alt" style={{ animation: 'spin 1s linear infinite' }} />}
                            {loading ? 'Đang gửi...' : t('features.community.submit')}
                        </button>
                    </div>

                    {/* ── Right: Recent reports list ─────────── */}
                    <div className="lg:col-span-2">
                        <h4 style={{ color: theme.text, fontWeight: 700, marginBottom: '20px' }}>
                            {t('features.community.recent')}
                        </h4>

                        {/* Loading skeleton */}
                        {loadingReports && (
                            <div style={{ color: theme.textDim, fontSize: '13px', textAlign: 'center', padding: '24px' }}>
                                <i className="bx bx-loader-alt" style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} />
                                Đang tải báo cáo...
                            </div>
                        )}

                        {/* Empty state */}
                        {!loadingReports && reports.length === 0 && (
                            <div style={{ color: theme.textDim, fontSize: '13px', textAlign: 'center', padding: '24px' }}>
                                Chưa có báo cáo nào.
                            </div>
                        )}

                        {/* Report cards */}
                        {reports.map((report, i) => (
                            <div
                                key={i}
                                style={{ background: theme.bgCard, border: `1px solid ${report.isNew ? 'rgba(245,158,11,0.4)' : theme.border}`, borderRadius: '12px', padding: '16px', marginBottom: '12px', transition: 'border-color 0.3s' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 800 }}>
                                        {report.isNew ? t('features.community.new') : (report.type || 'REPORT')}
                                    </span>
                                    <span style={{ fontSize: '10px', color: theme.textFaint }}>
                                        {report.time || t('features.community.time_ago')}
                                    </span>
                                </div>
                                <div style={{ color: theme.textSub, fontSize: '13px', fontWeight: 600, marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {report.url}
                                </div>
                                <div style={{ color: theme.textDim, fontSize: '11px' }}>
                                    {report.description || t('features.community.example_desc')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Spinner keyframe */}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default CommunityReport;
