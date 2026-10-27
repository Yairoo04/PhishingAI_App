import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';
import { FaChrome, FaEdge, FaFirefox, FaOpera } from 'react-icons/fa';

const ExtensionDownload = () => {
    const { t } = useTranslation();
    const { theme, darkMode } = useTheme();

    const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/phishing-ai-detector/paaapfmmpeheagonmpkciecfdhkophem';

    const browsers = [
        { name: 'Google Chrome', icon: <FaChrome style={{ fontSize: '56px', color: '#4285f4' }} />, status: t('features.extension.avail'), color: '#4285f4', link: CHROME_STORE_URL },
        { name: 'Microsoft Edge', icon: <FaEdge style={{ fontSize: '56px', color: '#0078d7' }} />, status: t('features.extension.avail'), color: '#0078d7', link: CHROME_STORE_URL },
        { name: 'Mozilla Firefox', icon: <FaFirefox style={{ fontSize: '56px', color: '#ff7139' }} />, status: t('features.extension.avail'), color: '#ff7139', link: CHROME_STORE_URL },
        { name: 'Opera', icon: <FaOpera style={{ fontSize: '56px', color: '#ff1b2d' }} />, status: t('features.extension.avail'), color: '#ff1b2d', link: CHROME_STORE_URL },
    ];

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, paddingTop: '100px', paddingBottom: '60px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
                <div style={{ marginBottom: '48px' }}>
                    <h1 style={{ fontSize: '36px', fontWeight: 800, color: theme.text, marginBottom: '16px' }}>
                        {t('features.extension.title')} <span style={{ color: '#10b981' }}>{t('features.extension.title_hl')}</span>
                    </h1>
                    <p style={{ color: theme.textMuted, fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
                        {t('features.extension.desc')}
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 mb-14">
                    {browsers.map((b, i) => (
                        <div
                            key={i}
                            className="hover:scale-105 hover:shadow-lg"
                            style={{
                                background: theme.bgCard,
                                border: `1px solid ${theme.border}`,
                                borderRadius: '16px',
                                padding: '32px 24px',
                                transition: 'transform 0.2s',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                minHeight: '300px'
                            }}
                        >
                            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                {b.icon}
                                <h3 style={{ color: theme.text, fontSize: '18px', fontWeight: 700, marginBottom: '8px', marginTop: '16px', textAlign: 'center' }}>{b.name}</h3>
                                <span style={{ fontSize: '12px', color: b.status === t('features.extension.avail') ? '#10b981' : theme.textDim, fontWeight: 600, textAlign: 'center', display: 'block' }}>{b.status}</span>
                            </div>
                            
                            <div style={{ width: '100%', marginTop: 'auto', paddingTop: '24px' }}>
                                {b.link ? (
                                    <a
                                        href={b.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ display: 'block', width: '100%', padding: '10px', borderRadius: '8px', background: b.color, color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box', textAlign: 'center' }}
                                    >
                                        {t('features.extension.download')}
                                    </a>
                                ) : (
                                    <button style={{ width: '100%', padding: '10px', borderRadius: '8px', background: b.status === t('features.extension.avail') ? b.color : theme.badgeBg, color: '#fff', border: 'none', fontWeight: 600, cursor: b.status === t('features.extension.avail') ? 'pointer' : 'default', opacity: b.status === t('features.extension.avail') ? 1 : 0.5, textAlign: 'center' }}>
                                        {t('features.extension.download')}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ background: theme.bgCard2, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '40px' }}>
                    <h2 style={{ color: theme.text, fontSize: '24px', fontWeight: 700, marginBottom: '32px' }}>{t('features.extension.guide_title')}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                        {[
                            { icon: 'bx-store', step: '01', text: t('features.extension.step1') },
                            { icon: 'bxl-chrome', step: '02', text: t('features.extension.step2') },
                            { icon: 'bx-check-circle', step: '03', text: t('features.extension.step3') },
                            { icon: 'bx-shield-check', step: '04', text: t('features.extension.step4') }
                        ].map((item, i) => (
                            <div key={i} style={{ textAlign: 'center' }}>
                                <div style={{ width: '40px', height: '40px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontWeight: 700 }}>
                                    {item.step}
                                </div>
                                <i className={`bx ${item.icon}`} style={{ fontSize: '24px', color: theme.textMuted, marginBottom: '12px' }} />
                                <p style={{ color: theme.textSub, fontSize: '12px', lineHeight: 1.5 }}>{item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: '48px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '32px' }}>
                    <div style={{ textAlign: 'left' }}>
                        <h4 style={{ color: theme.text, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Privacy & Security</h4>
                        <Link to="/privacy" style={{ color: '#10b981', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }} className="hover:underline">
                            Read Extension Privacy Policy
                        </Link>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <h4 style={{ color: theme.text, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Support</h4>
                        <a href="https://phd.infoseclab.id.vn/" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }} className="hover:underline">
                            Visit Support Center
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExtensionDownload;
