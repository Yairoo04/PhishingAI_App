import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { motion } from 'framer-motion';

const PrivacyPolicy = () => {
    const { t } = useTranslation();
    const { theme, darkMode } = useTheme();

    const sections = [
        {
            title: 'Data Collection',
            content: 'The extension may access the current webpage URL and limited webpage content in order to analyze potential phishing threats.'
        },
        {
            title: 'Data Usage',
            content: 'The collected data is used only for phishing detection and security analysis.'
        },
        {
            title: 'Data Sharing',
            content: 'No personal data is sold or shared with third parties.'
        },
        {
            title: 'Server Communication',
            content: 'The extension may send the current webpage URL to a remote analysis server to evaluate phishing risk.'
        },
        {
            title: 'User Privacy',
            content: 'The extension does not collect personal identification information such as names, emails, passwords, or financial data.'
        },
        {
            title: 'Contact',
            content: (
                <span>
                    For support or questions, please contact:{' '}
                    <a
                        href="https://phd.infoseclab.id.vn/"
                        className="text-green-500 hover:underline transition-all"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        https://phd.infoseclab.id.vn/
                    </a>
                </span>
            )
        }
    ];

    return (
        <div
            className="min-h-screen pt-24 pb-20 px-4 sm:px-10 relative overflow-hidden"
            style={{ background: theme.bg }}
        >
            {/* Background Grid */}
            <div
                className="fixed inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, ${theme.text} 1px, transparent 0)`,
                    backgroundSize: '40px 40px'
                }}
            />

            <div className="max-w-4xl mx-auto relative z-10">
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-16"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-1 bg-green-500 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-green-500">
                            Legal Documentation
                        </span>
                    </div>
                    <h1
                        className="text-5xl font-black tracking-tighter mb-4"
                        style={{ color: theme.text }}
                    >
                        Privacy <span className="text-green-500">Policy</span>
                    </h1>
                    <p style={{ color: theme.textMuted }} className="text-lg font-medium">
                        Phishing AI Detector — Browser security Extension
                    </p>
                </motion.header>

                <div className="space-y-8">
                    {sections.map((section, idx) => (
                        <motion.section
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="p-8 rounded-[2rem] border border-white/5 backdrop-blur-md transition-all duration-300 hover:border-green-500/20"
                            style={{ background: theme.bgCard }}
                        >
                            <h2
                                className="text-xl font-black mb-4 flex items-center gap-3"
                                style={{ color: theme.text }}
                            >
                                <span className="w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center text-xs text-green-500 font-bold">
                                    0{idx + 1}
                                </span>
                                {section.title}
                            </h2>
                            <div
                                className="text-sm leading-relaxed font-medium opacity-80"
                                style={{ color: theme.text }}
                            >
                                {section.content}
                            </div>
                        </motion.section>
                    ))}
                </div>

                <motion.footer
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-20 text-center"
                >
                    <p className="text-xs uppercase tracking-[0.4em] opacity-40" style={{ color: theme.text }}>
                        Last Updated: March 2026
                    </p>
                </motion.footer>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
