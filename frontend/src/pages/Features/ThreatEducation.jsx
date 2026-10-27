import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const ThreatEducation = () => {
    const { t } = useTranslation();
    const { theme, darkMode } = useTheme();

    const threats = [
        {
            title: t('features.education.t1_title'),
            desc: t('features.education.t1_desc'),
            example: 'BAD: paypa1-login.com · secure.paypal-verify.net',
            icon: 'bx-link-external',
            color: '#ef4444'
        },
        {
            title: t('features.education.t2_title'),
            desc: t('features.education.t2_desc'),
            example: 'WARN: bit.ly/3xR9Kzm -> paypal-steal.xyz',
            icon: 'bx-shield-quarter',
            color: '#f59e0b'
        },
        {
            title: t('features.education.t3_title'),
            desc: t('features.education.t3_desc'),
            example: 'BAD: noreply@amazon-mail.net · support@g00gle.com',
            icon: 'bx-envelope',
            color: '#3b82f6'
        },
        {
            title: t('features.education.t4_title'),
            desc: t('features.education.t4_desc'),
            example: 'URGENT: Your account will be suspended. Action required now.',
            icon: 'bx-timer',
            color: '#ef4444'
        }
    ];

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, paddingTop: '80px', paddingBottom: '60px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px' }}>
                <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, color: theme.text }}>{t('features.education.title')} <span style={{ color: '#10b981' }}>{t('features.education.title_hl')}</span> {t('features.education.title_end')}</h1>
                    <p style={{ color: theme.textMuted, marginTop: '8px' }}>{t('features.education.desc')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {threats.map((t, i) => (
                        <div key={i} style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '100px', color: t.color, opacity: 0.05 }}>
                                <i className={`bx ${t.icon}`} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ width: '40px', height: '40px', background: `${t.color}20`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className={`bx ${t.icon}`} style={{ color: t.color, fontSize: '20px' }} />
                                </div>
                                <h3 style={{ color: theme.text, fontSize: '18px', fontWeight: 700, margin: 0 }}>{t.title}</h3>
                            </div>
                            <p style={{ color: theme.textMuted, fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>{t.desc}</p>
                            <div style={{ background: theme.badgeBg, padding: '12px', borderRadius: '6px', borderLeft: `3px solid ${t.color}` }}>
                                <code style={{ color: theme.textSub, fontSize: '12px' }}>{t.example}</code>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ThreatEducation;
