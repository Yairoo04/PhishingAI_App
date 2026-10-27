import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';

const FeaturesDisplay = ({ features }) => {
    const { theme } = useTheme();

    if (!features || features.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="group p-8 rounded-[2rem] border border-white/5 shadow-xl transition-all duration-300 relative overflow-hidden"
                    style={{ background: theme.bgCard }}
                >
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-colors" />

                    <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                        <i className={`bx ${f.icon} text-3xl text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]`} />
                    </div>

                    <h4 className="text-xl font-black mb-3 tracking-tight group-hover:text-green-500 transition-colors" style={{ color: theme.text }}>
                        {f.title}
                    </h4>

                    <p className="text-sm leading-relaxed opacity-50 font-medium" style={{ color: theme.text }}>
                        {f.desc}
                    </p>

                    <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-green-500 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0">
                        Learn More <i className="bx bx-right-arrow-alt text-lg" />
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default FeaturesDisplay;
