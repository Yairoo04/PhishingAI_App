import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaShieldAlt } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';

const Footer = () => {
    const { t } = useTranslation();
    const { theme, darkMode } = useTheme();
    const currentYear = new Date().getFullYear();

    const footerLinks = [
        {
            title: t('nav.scanners'),
            links: [
                { name: t('nav.phishing'), path: '/phishing' },
                { name: t('nav.malware'), path: '/malware' },
                { name: t('nav.screenshot'), path: '/screenshot' },
                { name: t('nav.qr'), path: '/qr-scanner' },
            ],
        },
        {
            title: t('nav.intelligence'),
            links: [
                { name: t('nav.dashboard'), path: '/dashboard' },
                { name: t('nav.history'), path: '/history' },
                { name: t('nav.domain'), path: '/domain-lookup' },
                { name: t('nav.darkweb'), path: '/darkweb' },
            ],
        },
        {
            title: t('nav.tools'),
            links: [
                { name: t('nav.extension'), path: '/extension' },
                { name: t('nav.api'), path: '/api-access' },
                { name: t('nav.report'), path: '/report' },
                { name: t('nav.education'), path: '/education' },
            ],
        },
    ];

    return (
        <footer
            className="relative overflow-hidden"
            style={{
                background: darkMode
                    ? 'linear-gradient(180deg, #0a0a0b 0%, #060d1a 100%)'
                    : 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
            }}
        >
            {/* Decorative top border */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />

            <div className="max-w-7xl mx-auto px-6 pt-16 pb-8">
                {/* Main Footer Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-14">
                    {/* Brand Column */}
                    <div className="lg:col-span-2">
                        <Link to="/" className="flex items-center gap-3 mb-5 group">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center border group-hover:scale-110 transition-transform"
                                style={{
                                    background: 'rgba(34,197,94,0.1)',
                                    borderColor: 'rgba(34,197,94,0.3)',
                                }}
                            >
                                <FaShieldAlt className="text-xl text-green-500" />
                            </div>
                            <span className="text-lg font-bold uppercase tracking-wider" style={{ color: theme.text }}>
                                PHISH<span className="text-green-500">GUARD</span>
                            </span>
                        </Link>
                        <p className="text-sm leading-relaxed max-w-xs mb-6" style={{ color: theme.textMuted }}>
                            {t('hero.subtitle')}
                        </p>
                        {/* Social Links */}
                        <div className="flex gap-3">
                            {[
                                { icon: 'bxl-github', href: '#' },
                                { icon: 'bxl-facebook-circle', href: '#' },
                                { icon: 'bxl-linkedin', href: '#' },
                            ].map((s, i) => (
                                <a
                                    key={i}
                                    href={s.href}
                                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 hover:bg-green-500/10"
                                    style={{
                                        background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                        border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.10)',
                                    }}
                                >
                                    <i className={`bx ${s.icon} text-lg hover:text-green-500`} style={{ color: theme.textMuted }} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Link Columns */}
                    {footerLinks.map((section, idx) => (
                        <div key={idx}>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500/80 mb-5">
                                {section.title}
                            </h4>
                            <ul className="space-y-3">
                                {section.links.map((link, lIdx) => (
                                    <li key={lIdx}>
                                        <Link
                                            to={link.path}
                                            className="text-sm hover:text-green-400 transition-colors duration-200 flex items-center gap-2 group"
                                            style={{ color: theme.textMuted }}
                                        >
                                            <span className="w-0 group-hover:w-2 h-px bg-green-500 transition-all duration-300" />
                                            {link.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom Bar */}
                <div
                    className="pt-7 flex flex-col sm:flex-row items-center justify-between gap-4"
                    style={{ borderTop: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)' }}
                >
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <Link
                            to="/privacy"
                            className="text-xs hover:text-green-500 transition-colors"
                            style={{ color: theme.textDim }}
                        >
                            Privacy Policy
                        </Link>
                        <p className="text-xs" style={{ color: theme.textDim }}>
                            {t('footer.copyright', { year: currentYear })}
                        </p>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                        <p className="text-xs" style={{ color: theme.textDim }}>
                            {t('footer.designed_by')}{' '}
                            <span className="text-green-500/80 font-semibold">Gioi</span>
                        </p>
                        <p className="text-xs" style={{ color: theme.textDim }}>
                            {t('footer.partner')}{' '}
                            <span className="text-green-500/80 font-semibold">Tri &bull; Tuan &bull; Bao</span>
                        </p>
                        <p className="text-sm" style={{ color: theme.textDim }}>
                            {t('footer.supervisor')}{' '}
                            <span className="text-sm font-semibold text-green-400">{t('footer.supervisor_name')}</span>
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
