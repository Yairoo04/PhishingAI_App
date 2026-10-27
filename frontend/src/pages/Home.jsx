import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import {
    FaShieldAlt,
    FaChrome,
    FaFirefox,
    FaEdge,
    FaOpera,
    FaGlobe,
    FaMobileAlt,
    FaLock,
    FaUserSecret,
    FaBug
} from 'react-icons/fa';

const Home = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { theme, darkMode } = useTheme();
    const [url, setUrl] = useState('');

    const handleCheck = () => {
        if (url.trim() !== '') {
            navigate(`/phishing?url=${encodeURIComponent(url)}`);
        } else {
            navigate('/phishing');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleCheck();
    };

    const browsers = [
        { name: 'Chrome', icon: <FaChrome className="text-4xl text-blue-500" /> },
        { name: 'Edge', icon: <FaEdge className="text-4xl text-blue-700" /> },
        { name: 'Firefox', icon: <FaFirefox className="text-4xl text-orange-500" /> },
        { name: 'Opera', icon: <FaOpera className="text-4xl text-red-500" /> },
    ];

    const features = [
        { icon: <FaGlobe className="text-4xl text-green-500" />, title: t('home.features.safe_browsing'), desc: t('home.features.safe_browsing_desc') },
        { icon: <FaMobileAlt className="text-4xl text-blue-500" />, title: t('home.features.cross_platform'), desc: t('home.features.cross_platform_desc') },
        { icon: <FaLock className="text-4xl text-purple-500" />, title: t('home.features.realtime'), desc: t('home.features.realtime_desc') },
        { icon: <FaUserSecret className="text-4xl text-red-500" />, title: t('home.features.privacy'), desc: t('home.features.privacy_desc') },
        { icon: <FaBug className="text-4xl text-yellow-500" />, title: t('home.features.scam_reporting'), desc: t('home.features.scam_reporting_desc') },
        { icon: <FaShieldAlt className="text-4xl text-teal-500" />, title: t('home.features.ai_analysis'), desc: t('home.features.ai_analysis_desc') },
    ];

    const stats = [
        { value: '1.2M+', label: 'URLs Scanned' },
        { value: '85K+', label: 'Phishing Detected' },
        { value: '50K+', label: 'Users Protected' },
    ];

    /* ── shared font styles ── */
    const fontThin = { fontFamily: "'DM Sans', 'Inter', sans-serif", fontWeight: 200 };
    const fontLight = { fontFamily: "'DM Sans', 'Inter', sans-serif", fontWeight: 300 };
    const fontNormal = { fontFamily: "'DM Sans', 'Inter', sans-serif", fontWeight: 400 };
    const fontMedium = { fontFamily: "'DM Sans', 'Inter', sans-serif", fontWeight: 500 };
    const fontBold = { fontFamily: "'DM Sans', 'Inter', sans-serif", fontWeight: 700 };

    return (
        <div style={{ backgroundColor: theme.bg }}>

            {/* ════════════════════════════════
                HERO — full-screen with navbar clearance
                The Navbar is fixed & transparent at top.
                h-screen covers full viewport; pt pushes inner
                content below the navbar so nothing is hidden.
            ════════════════════════════════ */}
            <section
                className="min-h-screen flex items-center justify-center overflow-hidden"
                style={{
                    background: darkMode
                        ? 'linear-gradient(135deg, #060d1a 0%, #0a0a0b 55%, #051209 100%)'
                        : 'linear-gradient(135deg, #1e3a5f 0%, #1a237e 55%, #0d3b2e 100%)',
                }}
            >
                {/* Ambient blobs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div
                        className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full blur-3xl animate-pulse"
                        style={{ background: darkMode ? 'rgba(29,78,216,0.25)' : 'rgba(29,78,216,0.35)', opacity: 0.5 }}
                    />
                    <div
                        className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full blur-3xl animate-pulse"
                        style={{ background: darkMode ? 'rgba(22,163,74,0.2)' : 'rgba(22,163,74,0.3)', opacity: 0.4, animationDelay: '1.2s' }}
                    />
                </div>

                {/*
                    paddingTop = NAVBAR_HEIGHT ensures the visible
                    content top edge sits below the fixed navbar bar.
                    The section still fills h-screen perfectly.
                */}
                <div
                    className="relative z-10 w-full text-center max-w-5xl mx-auto px-6 pt-32 pb-12"
                >
                    {/* Background Animation Layer — Magnifier (Continuous Loop) */}
                    <div
                        className="absolute top-40 left-0 w-full flex justify-center pointer-events-none"
                        style={{ zIndex: -1 }}
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8 }}
                            className="flex items-center justify-center relative"
                            style={{ transform: 'scale(3.5)', opacity: 0.6 }}
                        >
                            {/* Pulse rings */}
                            {[0, 0.9, 1.8].map((delay, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute rounded-full border"
                                    style={{ width: 220, height: 220, borderColor: 'rgba(34,197,94,0.3)' }}
                                    animate={{ scale: [0.85, 1.9], opacity: [0.7, 0] }}
                                    transition={{ duration: 2.8, repeat: Infinity, delay, ease: 'easeOut' }}
                                />
                            ))}

                            {/* Spinning dashed orbit */}
                            <motion.div
                                className="absolute rounded-full"
                                style={{ width: 260, height: 260, border: '1px dashed rgba(34,197,94,0.18)' }}
                                animate={{ rotate: 360 }}
                                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                            />

                            {/* SVG Lens - Perfectly Centered at (60, 60) */}
                            <motion.svg
                                width="160" height="160" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"
                                animate={{ opacity: [0.35, 0.9, 0.35] }}
                                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                            >
                                <defs>
                                    <clipPath id="lensClipHero">
                                        <circle cx="60" cy="60" r="34" />
                                    </clipPath>
                                    <radialGradient id="lensGlow" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor="#4ade80" stopOpacity="0.2" />
                                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                                    </radialGradient>
                                </defs>

                                {/* Main Lens Circle centered at (60,60) */}
                                <circle cx="60" cy="60" r="34" fill="url(#lensGlow)" stroke="rgba(34,197,94,0.5)" strokeWidth="2.5" />

                                {/* Internal Grid & Crosshair */}
                                <g clipPath="url(#lensClipHero)" stroke="rgba(34,197,94,0.25)" strokeWidth="0.8" fill="none">
                                    <line x1="26" y1="60" x2="94" y2="60" />
                                    <line x1="60" y1="26" x2="60" y2="94" />
                                    <circle cx="60" cy="60" r="12" />
                                    <circle cx="60" cy="60" r="22" />
                                </g>

                                {/* Center Dot */}
                                <circle cx="60" cy="60" r="2.5" fill="#4ade80" />

                                {/* Handle starting at lens edge (84,84) pointing to (108,108) */}
                                <line x1="84" y1="84" x2="108" y2="108" stroke="rgba(34,197,94,0.7)" strokeWidth="7" strokeLinecap="round" />

                                {/* Corner Bracket Guides */}
                                <g stroke="rgba(34,197,94,0.45)" strokeWidth="1.5" fill="none" strokeLinecap="round">
                                    <path d="M33,41 L33,32 L42,32" />
                                    <path d="M78,32 L87,32 L87,41" />
                                    <path d="M33,79 L33,88 L42,88" />
                                    <path d="M78,88 L87,88 L87,79" />
                                </g>
                            </motion.svg>

                            {/* Cây kim quay 360 độ đúng từ tâm kính lúp (60,60 = 50% 50%) */}
                            <motion.div
                                className="absolute pointer-events-none"
                                style={{
                                    width: '2px',
                                    height: '42px',
                                    background: 'linear-gradient(to top, rgba(74,222,128,0.95), transparent)',
                                    borderRadius: '2px',
                                    boxShadow: '0 0 10px rgba(74,222,128,0.9)',
                                    top: 'calc(50% - 42px)',
                                    left: 'calc(50% - 1px)',
                                    transformOrigin: 'bottom center',
                                }}
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 3.0, repeat: Infinity, ease: 'linear' }}
                            />
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 32 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                    >
                        {/* Eyebrow */}
                        <p
                            className="text-sm md:text-base mb-4 tracking-[0.35em] uppercase"
                            style={{ ...fontThin, color: 'rgba(148,163,184,0.85)', letterSpacing: '0.35em' }}
                        >
                            {t('hero.title_part1')}
                        </p>

                        {/* Main heading */}
                        <h1
                            className="text-5xl md:text-7xl mb-6 leading-[1.1]"
                            style={{ ...fontBold, color: '#f8fafc' }}
                        >
                            {t('hero.title_part2')}{' '}
                            <span
                                className="text-transparent bg-clip-text"
                                style={{ backgroundImage: 'linear-gradient(90deg, #4ade80, #60a5fa)' }}
                            >
                                {t('hero.title_part3')}
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p
                            className="text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
                            style={{ ...fontLight, color: 'rgba(148,163,184,0.9)' }}
                        >
                            {t('hero.subtitle')}
                        </p>

                        {/* Enhanced URL input bar with AI Scanning Animation */}
                        <div className="relative w-full max-w-2xl mx-auto group perspective-1000 mb-12">
                            {/* Animated Background Glow */}
                            <motion.div
                                animate={{
                                    boxShadow: [
                                        "0 0 20px rgba(34,197,94,0.1)",
                                        "0 0 40px rgba(34,197,94,0.3)",
                                        "0 0 20px rgba(34,197,94,0.1)"
                                    ]
                                }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500/20 via-blue-500/20 to-green-500/20 blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"
                            />

                            <div
                                className="relative flex items-center w-full rounded-full overflow-hidden border backdrop-blur-xl shadow-2xl transition-all duration-300"
                                style={{
                                    background: darkMode ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.95)',
                                    borderColor: darkMode ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.4)',
                                }}
                            >
                                {/* Scanning Beam Effect */}
                                <motion.div
                                    className="absolute top-0 bottom-0 w-32 pointer-events-none"
                                    style={{
                                        background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.2), transparent)',
                                        boxShadow: '0 0 20px rgba(34,197,94,0.5)',
                                    }}
                                    animate={{
                                        left: ["-20%", "120%"]
                                    }}
                                    transition={{
                                        duration: 2.5,
                                        repeat: Infinity,
                                        ease: "linear"
                                    }}
                                />

                                {/* Static Icon inside input */}
                                <div className="absolute left-6 z-10 text-green-500 flex items-center justify-center opacity-70">
                                    <i className="bx bx-link text-2xl" />
                                </div>

                                <input
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={t('hero.placeholder')}
                                    className="w-full py-5 pl-16 pr-44 bg-transparent focus:outline-none relative z-10"
                                    style={{
                                        ...fontLight,
                                        color: darkMode ? '#f8fafc' : '#0f172a',
                                        fontSize: '1.05rem',
                                    }}
                                />

                                <div className="absolute right-2 top-2 bottom-2 z-10">
                                    <button
                                        onClick={handleCheck}
                                        className="h-full rounded-full px-8 text-sm text-white font-bold tracking-wider uppercase transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,197,94,0.6)] hover:scale-105 active:scale-95 flex items-center gap-2"
                                        style={{
                                            ...fontMedium,
                                            background: 'linear-gradient(135deg, #22c55e, #10b981)',
                                            boxShadow: '0 4px 15px rgba(34,197,94,0.3)',
                                        }}
                                    >
                                        <i className="bx bx-shield-check text-lg" />
                                        {t('hero.btn_check')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ════════════════════════════════
                FEATURES
            ════════════════════════════════ */}
            <section
                className="py-24"
                style={{ background: darkMode ? '#111114' : '#ffffff' }}
            >
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2
                            className="text-3xl md:text-4xl mb-4"
                            style={{ ...fontBold, color: theme.text }}
                        >
                            {t('home.why_choose_us')}
                        </h2>
                        <p
                            className="max-w-xl mx-auto text-base"
                            style={{ ...fontLight, color: theme.textMuted }}
                        >
                            {t('home.why_desc')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                whileHover={{ y: -8, scale: 1.02 }}
                                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                                className="p-8 rounded-2xl border transition-shadow hover:shadow-xl"
                                style={{
                                    background: theme.bgCard2,
                                    borderColor: theme.border,
                                }}
                            >
                                <div className="mb-5">{feature.icon}</div>
                                <h3
                                    className="text-lg mb-2"
                                    style={{ ...fontMedium, color: theme.text }}
                                >
                                    {feature.title}
                                </h3>
                                <p
                                    className="text-sm leading-relaxed"
                                    style={{ ...fontLight, color: theme.textMuted }}
                                >
                                    {feature.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════
                STATS
            ════════════════════════════════ */}
            <section
                className="py-20"
                style={{ background: darkMode ? '#0a0a0b' : '#f1f5f9' }}
            >
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {stats.map((stat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15, duration: 0.6 }}
                            >
                                <div
                                    className="text-5xl mb-2"
                                    style={{ ...fontBold, color: '#22c55e' }}
                                >
                                    {stat.value}
                                </div>
                                <div
                                    className="text-xs uppercase tracking-[0.25em]"
                                    style={{ ...fontLight, color: theme.textDim }}
                                >
                                    {stat.label}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════
                BROWSERS
            ════════════════════════════════ */}
            <section
                className="py-16 border-t"
                style={{
                    background: darkMode ? '#111114' : '#f8fafc',
                    borderColor: theme.border,
                }}
            >
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2
                        className="text-xl mb-10"
                        style={{ ...fontLight, color: theme.textMuted, letterSpacing: '0.1em' }}
                    >
                        {t('home.browsers_title')}
                    </h2>
                    <div className="flex justify-center gap-12 flex-wrap">
                        {browsers.map((browser, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ scale: 1.12, y: -4 }}
                                transition={{ type: 'spring', stiffness: 400 }}
                                className="flex flex-col items-center gap-2"
                            >
                                {browser.icon}
                                <span
                                    className="text-xs tracking-wider"
                                    style={{ ...fontLight, color: theme.textDim }}
                                >
                                    {browser.name}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

        </div>
    );
};

export default Home;