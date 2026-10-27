import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const BrandImpersonation = () => {
    const { t } = useTranslation();
    const { theme, darkMode } = useTheme();
    const [analyzing, setAnalyzing] = useState(false);

    const brands = [
        { name: 'PayPal', logo: 'bxl-paypal', confidence: '99.8%' },
        { name: 'Amazon', logo: 'bxl-amazon', confidence: '98.5%' },
        { name: 'Apple', logo: 'bxl-apple', confidence: '99.1%' },
        { name: 'Facebook', logo: 'bxl-facebook-circle', confidence: '97.4%' },
        { name: 'Google', logo: 'bxl-google', confidence: '99.6%' },
        { name: 'Microsoft', logo: 'bxl-microsoft', confidence: '98.9%' },
    ];

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, paddingTop: '80px', paddingBottom: '60px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px' }}>
                <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <div style={{ width: '3px', height: '20px', background: '#f43f5e', borderRadius: '2px' }} />
                        <span style={{ color: '#f43f5e', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('features.brand.badge')}</span>
                    </div>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, color: theme.text, margin: 0 }}>{t('features.brand.title')} <span style={{ color: '#f43f5e' }}>{t('features.brand.title_hl')}</span></h1>
                    <p style={{ color: theme.textMuted, fontSize: '13px', marginTop: '4px' }}>{t('features.brand.desc')}</p>
                </div>

                <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '40px', marginBottom: '40px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{ width: '80px', height: '80px', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <i className="bx bx-camera" style={{ fontSize: '32px' }} />
                        </div>
                        <h3 style={{ color: theme.text, fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{t('features.brand.analyze_title')}</h3>
                        <p style={{ color: theme.textDim, fontSize: '14px' }}>{t('features.brand.analyze_desc')}</p>
                    </div>
                    <button onClick={() => setAnalyzing(!analyzing)} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#f43f5e', color: '#fff', border: 'none', fontWeight: 700, fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(244,63,94,0.3)' }}>
                        {analyzing ? t('features.brand.analyzing') : t('features.brand.analyze_btn')}
                    </button>
                </div>

                <div>
                    <h4 style={{ color: theme.text, fontWeight: 700, marginBottom: '20px' }}>{t('features.brand.supported')}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        {brands.map((b, i) => (
                            <div key={i} style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                                <i className={`bx ${b.logo}`} style={{ fontSize: '32px', color: theme.textFaint, marginBottom: '12px' }} />
                                <div style={{ color: theme.textSub, fontSize: '14px', fontWeight: 600 }}>{b.name}</div>
                                <div style={{ color: '#f43f5e', fontSize: '10px', fontWeight: 800, marginTop: '4px' }}>{b.confidence} ACC</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BrandImpersonation;
