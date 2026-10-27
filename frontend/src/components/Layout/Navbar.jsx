import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { FaShieldAlt, FaMoon, FaSun } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';

const Navbar = () => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { theme, darkMode, toggleDarkMode } = useTheme();
    const location = useLocation();
    const [activeDropdown, setActiveDropdown] = useState(null);

    /* ── helpers ── */
    const changeLanguage = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'vi' : 'en');
    };

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    /* ── nav data ── */
    const navCategories = [
        {
            title: t('nav.scanners'),
            links: [
                { name: t('nav.phishing'), path: '/phishing', icon: 'bx-shield-quarter' },
                { name: t('nav.malware'), path: '/malware', icon: 'bx-bug' },
                { name: t('nav.screenshot'), path: '/screenshot', icon: 'bx-camera' },
                { name: t('nav.qr'), path: '/qr-scanner', icon: 'bx-qr' },
                { name: t('nav.brand'), path: '/brand-impersonation', icon: 'bx-intersect' },
            ],
        },
        {
            title: t('nav.intelligence'),
            links: [
                { name: t('nav.dashboard'), path: '/dashboard', icon: 'bx-stats' },
                { name: t('nav.history'), path: '/history', icon: 'bx-history' },
                { name: t('nav.domain'), path: '/domain-lookup', icon: 'bx-globe' },
                { name: t('nav.darkweb'), path: '/darkweb', icon: 'bx-shield-quarter' }, // sửa icon phù hợp hơn
            ],
        },
        {
            title: t('nav.tools'),
            links: [
                { name: t('nav.extension'), path: '/extension', icon: 'bx-puzzle' },
                { name: t('nav.api'), path: '/api-access', icon: 'bx-code' },
                { name: t('nav.report'), path: '/report', icon: 'bx-flag' },
                { name: t('nav.education'), path: '/education', icon: 'bx-book' },
            ],
        },
    ];

    /* ── derived inline styles (theme-aware) ── */
    const navTextColor = theme.navBtnColor;
    const navTextMuted = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(15,23,42,0.65)';

    const navbarBg = scrolled ? theme.navbarScrollBg : theme.navbarBg;
    const navbarBorder = theme.navbarScrollBorder;

    const iconBtnStyle = {
        color: theme.navBtnColor,
        background: theme.navBtnBg,
        border: `1px solid ${theme.navBtnBorder}`,
    };

    const dropdownItemHover = {
        background: theme.navItemHover,
    };

    const mobileItemStyle = {
        background: theme.mobileLinkBg,
        border: `1px solid ${theme.mobileLinkBorder}`,
    };

    const VN_FONT = "'Be Vietnam Pro', 'Inter', system-ui, sans-serif";

    return (
        <nav
            className={`fixed top-0 left-0 w-full transition-all duration-300 ${scrolled ? 'py-0 shadow-md' : 'py-0'}`}
            style={{
                zIndex: 99999,
                background: navbarBg,
                borderBottom: `1px solid ${navbarBorder}`,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
            }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group z-10">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center border group-hover:scale-110 transition-transform duration-300"
                            style={{
                                background: 'rgba(34,197,94,0.1)',
                                borderColor: 'rgba(34,197,94,0.3)',
                            }}
                        >
                            <FaShieldAlt className="text-2xl text-green-500" />
                        </div>
                        <span
                            className="text-xl font-bold uppercase tracking-wider"
                            style={{
                                color: navTextColor,
                                letterSpacing: '0.15em',
                                fontFamily: VN_FONT,
                            }}
                        >
                            PHISH<span className="text-green-500">GUARD</span>
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden lg:flex items-center gap-10">
                        <Link
                            to="/"
                            className="text-sm uppercase tracking-wider hover:text-green-400 transition-colors duration-200"
                            style={{ color: navTextMuted, fontWeight: 500, fontFamily: VN_FONT }}
                        >
                            {t('nav.home')}
                        </Link>

                        {navCategories.map((cat, idx) => (
                            <div
                                key={idx}
                                className="relative py-7"
                                style={{ zIndex: activeDropdown === idx ? 100 : 1 }}
                                onMouseEnter={() => setActiveDropdown(idx)}
                                onMouseLeave={() => setActiveDropdown(null)}
                            >
                                <button
                                    onClick={() => setActiveDropdown(activeDropdown === idx ? null : idx)}
                                    className="flex items-center gap-1.5 text-sm uppercase tracking-wider hover:text-green-500 transition-colors duration-200"
                                    style={{ color: navTextMuted, fontWeight: 500, fontFamily: VN_FONT }}
                                >
                                    {cat.title}
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                        className={`transition-transform duration-300 ${activeDropdown === idx ? 'rotate-180 text-green-500' : ''}`}
                                    >
                                        <path d="m12 15.41 5.71-5.7-1.42-1.42-4.29 4.3-4.29-4.3-1.42 1.42z"></path>
                                    </svg>
                                </button>

                                <AnimatePresence>
                                    {activeDropdown === idx && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                            className="absolute left-1/2 -translate-x-1/2 pt-5 w-72"
                                            style={{ zIndex: 10000 }}
                                        >
                                            <div
                                                className="p-4 rounded-2xl shadow-2xl overflow-hidden border"
                                                style={{
                                                    background: theme.navDropdownBg,
                                                    borderColor: theme.navDropdownBorder,
                                                    backdropFilter: 'blur(20px)',
                                                }}
                                            >
                                                <div className="grid grid-cols-1 gap-1">
                                                    {cat.links.map((link, lIdx) => (
                                                        <Link
                                                            key={lIdx}
                                                            to={link.path}
                                                            className="flex items-center gap-4 p-3.5 rounded-xl transition-all duration-200 group hover:bg-opacity-10"
                                                            style={{
                                                                color: theme.text,
                                                                background: 'transparent',
                                                            }}
                                                            onMouseEnter={(e) =>
                                                                (e.currentTarget.style.background = dropdownItemHover.background)
                                                            }
                                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                                        >
                                                            <div
                                                                className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                                                                style={{
                                                                    background: 'rgba(34,197,94,0.12)',
                                                                    border: '1px solid rgba(34,197,94,0.20)',
                                                                }}
                                                            >
                                                                <i className={`bx ${link.icon} text-2xl text-green-500`} />
                                                            </div>
                                                            <span
                                                                className="text-base font-medium"
                                                                style={{ color: theme.textMuted }}
                                                            >
                                                                {link.name}
                                                            </span>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden lg:flex items-center gap-4">
                        {/* Language */}
                        <button
                            onClick={changeLanguage}
                            className="w-11 h-11 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200"
                            style={iconBtnStyle}
                            title="Switch language"
                        >
                            <span
                                className="text-sm font-semibold uppercase tracking-widest"
                                style={{ color: navTextColor, fontFamily: VN_FONT }}
                            >
                                {i18n.language === 'en' ? 'EN' : 'VI'}
                            </span>
                        </button>

                        {/* Theme toggle */}
                        <button
                            onClick={toggleDarkMode}
                            className="w-11 h-11 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200"
                            style={iconBtnStyle}
                            title={darkMode ? 'Switch to Light mode' : 'Switch to Dark mode'}
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                {darkMode ? (
                                    <motion.div
                                        key="sun"
                                        initial={{ rotate: -90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: 90, opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                    >
                                        <FaSun className="text-xl text-yellow-400" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="moon"
                                        initial={{ rotate: 90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: -90, opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                    >
                                        <FaMoon className="text-xl text-slate-600" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>

                        {/* CTA */}
                        <Link
                            to="/phishing"
                            className="px-7 py-3 rounded-2xl bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-semibold uppercase tracking-wider hover:brightness-110 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg"
                            style={{
                                boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
                                fontFamily: "'DM Sans', 'Inter', sans-serif",
                            }}
                        >
                            {t('hero.btn_check')}
                        </Link>
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="lg:hidden w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200"
                        style={iconBtnStyle}
                        aria-label="Toggle menu"
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.i
                                key={isOpen ? 'close' : 'open'}
                                initial={{ rotate: -90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 90, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`bx ${isOpen ? 'bx-x' : 'bx-menu'} text-3xl`}
                                style={{ color: navTextColor }}
                            />
                        </AnimatePresence>
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: 'spring', stiffness: 280, damping: 32 }}
                        className="fixed inset-0 lg:hidden backdrop-blur-xl"
                        style={{ zIndex: 9998, background: theme.mobileMenuBg }}
                    >
                        <div className="flex flex-col h-full p-6 pt-24">
                            {/* Lang + Theme */}
                            <div className="flex items-center gap-4 mb-8">
                                <button
                                    onClick={changeLanguage}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all"
                                    style={iconBtnStyle}
                                >
                                    {i18n.language === 'en' ? 'EN' : 'VI'}
                                </button>
                                <button
                                    onClick={toggleDarkMode}
                                    className="px-5 py-2.5 rounded-xl flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider transition-all"
                                    style={iconBtnStyle}
                                >
                                    {darkMode ? (
                                        <>
                                            <FaSun className="text-yellow-400" /> Light
                                        </>
                                    ) : (
                                        <>
                                            <FaMoon className="text-slate-500" style={{ color: theme.textMuted }} /> Dark
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-8 pb-10">
                                {/* Home */}
                                <Link
                                    to="/"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-5 p-5 rounded-2xl transition-all duration-200 hover:brightness-95"
                                    style={mobileItemStyle}
                                >
                                    <i className="bx bx-home text-3xl text-green-500" />
                                    <span className="text-xl font-bold" style={{ color: theme.text }}>
                                        {t('nav.home')}
                                    </span>
                                </Link>

                                {navCategories.map((cat, idx) => (
                                    <div key={idx} className="space-y-4">
                                        <h4
                                            className="text-xs font-black uppercase tracking-widest pl-2 opacity-70"
                                            style={{ color: theme.textMuted }}
                                        >
                                            {cat.title}
                                        </h4>
                                        <div className="space-y-3">
                                            {cat.links.map((link, lIdx) => (
                                                <Link
                                                    key={lIdx}
                                                    to={link.path}
                                                    onClick={() => setIsOpen(false)}
                                                    className="flex items-center gap-5 p-5 rounded-2xl transition-all duration-200"
                                                    style={mobileItemStyle}
                                                >
                                                    <i className={`bx ${link.icon} text-3xl text-green-500`} />
                                                    <span className="text-xl font-bold" style={{ color: theme.text }}>
                                                        {link.name}
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* CTA */}
                                <Link
                                    to="/phishing"
                                    onClick={() => setIsOpen(false)}
                                    className="block text-center mt-10 p-5 rounded-2xl bg-gradient-to-r from-green-600 to-green-500 text-white text-lg font-bold uppercase tracking-wider shadow-xl hover:brightness-110 transition-all duration-200"
                                >
                                    {t('hero.btn_check')}
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;