import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

const WindowsChecker = ({ setLoading, onResult }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) setFile(selectedFile);
    };

    const handleUpload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        try {
            const response = await fetch('/api/windows/scan', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            onResult({ ...data, filename: file.name, type: 'windows' });
        } catch (error) {
            console.error('Scan failed:', error);
            alert(t('tools.checkers.scan_failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="text-center max-w-2xl mx-auto">
            <div className="mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-cyan-500 bg-opacity-10 text-cyan-500 mb-6 shadow-lg shadow-cyan-500/10 border border-cyan-500/20">
                    <i className="bx bx-desktop text-5xl" />
                </div>
                <h3 className="text-2xl font-black mb-3 tracking-tight" style={{ color: theme.text }}>
                    {t('tools.checkers.pe_title')}
                </h3>
                <p className="text-sm opacity-60 max-w-md mx-auto leading-relaxed" style={{ color: theme.text }}>
                    {t('tools.desc.windows')}
                </p>
            </div>

            <div className="flex flex-col items-center gap-6">
                <input
                    type="file"
                    accept=".exe,.dll,.sys,.bat"
                    onChange={handleFileChange}
                    className="hidden"
                    id="windows-upload"
                />
                <label
                    htmlFor="windows-upload"
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileChange({ target: { files: e.dataTransfer.files } }); }}
                    className={`group relative flex flex-col items-center gap-4 w-full p-12 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden
                        ${dragging ? 'border-cyan-500 bg-cyan-500/5 scale-[1.02]' : 'hover:border-cyan-500/50 hover:bg-cyan-500/[0.02]'}`}
                    style={{
                        borderColor: dragging ? '#06b6d4' : theme.border,
                        background: theme.bgCard2
                    }}
                >
                    <div className="p-4 rounded-2xl bg-opacity-10 text-cyan-500 group-hover:scale-110 transition-transform duration-300" style={{ background: '#06b6d4' }}>
                        <i className={`bx ${file ? 'bx-check-double scale-125' : 'bx-window-alt'} text-4xl`} />
                    </div>
                    <div className="z-10 text-center">
                        <span className="block font-black text-base mb-1" style={{ color: theme.text }}>
                            {file ? file.name : t('tools.checkers.drop_desc')}
                        </span>
                        <span className="text-[10px] uppercase font-black tracking-widest opacity-40" style={{ color: theme.text }}>
                            Hỗ trợ .exe, .dll, .sys, .bat
                        </span>
                    </div>
                </label>

                <button
                    onClick={handleUpload}
                    disabled={!file}
                    className={`relative px-12 py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all duration-300 overflow-hidden
                        ${file ? 'bg-cyan-500 text-white shadow-xl shadow-cyan-500/30 hover:-translate-y-1 active:scale-95' : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'}`}
                >
                    <span className="relative z-10">{t('tools.checkers.analyze_btn')}</span>
                    {file && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                    )}
                </button>
            </div>
        </div>
    );
};

export default WindowsChecker;
