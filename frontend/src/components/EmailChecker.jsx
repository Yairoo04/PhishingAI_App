import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

const EmailChecker = ({ setLoading, loading, onResult }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFile = (file) => {
        if (file && file.name.toLowerCase().endsWith('.eml')) {
            setSelectedFile(file);
        } else {
            alert(t('tools.checkers.scan_failed'));
            setSelectedFile(null);
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const openFileDialog = () => {
        if (fileInputRef.current) {
            console.time('email-open-dialog'); // debug
            fileInputRef.current.value = "";
            fileInputRef.current.click();
            console.timeEnd('email-open-dialog');
        }
    };

    const handleUpload = async () => {
        const file = selectedFile;
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        try {
            const response = await fetch('/api/email/predict', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Server error');
            const data = await response.json();
            onResult({
                ...data,
                filename: file.name,
                prediction: data.prediction || 'unknown',
                phishing_probability: data.phishing_probability || 0,
                legitimate_probability: data.legitimate_probability || 0,
            }, data.features || null);
        } catch (error) {
            console.error('Email upload error:', error);
            alert(t('tools.checkers.scan_failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-sky-500 bg-opacity-10 text-sky-500 mb-6 shadow-lg shadow-sky-500/10 border border-sky-500/20">
                    <i className="bx bx-envelope text-5xl" />
                </div>
                <h3 className="text-2xl font-black mb-3 tracking-tight" style={{ color: theme.text }}>
                    {t('tools.checkers.email_title')}
                </h3>
                <p className="text-sm opacity-60 max-w-md mx-auto leading-relaxed" style={{ color: theme.text }}>
                    {t('tools.desc.email')}
                </p>
            </div>

            <div className="flex flex-col gap-6">
                <input
                    type="file"
                    accept=".eml"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />

                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
                    }}
                    className={`group relative flex flex-col items-center gap-4 w-full p-12 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden
                        ${isDragging ? 'border-sky-500 bg-sky-500/5 scale-[1.02]' : 'hover:border-sky-500/50 hover:bg-sky-500/[0.02]'}`}
                    style={{
                        borderColor: isDragging ? '#0ea5e9' : theme.border,
                        background: theme.bgCard2
                    }}
                >
                    <div className="p-4 rounded-2xl bg-opacity-10 text-sky-500 group-hover:scale-110 transition-transform duration-300" style={{ background: '#0ea5e9' }}>
                        <i className={`bx ${selectedFile ? 'bx-mail-send scale-125' : 'bx-envelope-open'} text-4xl`} />
                    </div>
                    <div className="z-10 text-center pointer-events-none">
                        <span className="block font-black text-base mb-1" style={{ color: theme.text }}>
                            {selectedFile ? selectedFile.name : t('tools.checkers.drop_desc')}
                        </span>
                        <span className="text-[10px] uppercase font-black tracking-widest opacity-40" style={{ color: theme.text }}>
                            {t('tools.checkers.max_size')} (.eml Only)
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            openFileDialog();
                        }}
                        className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-20 bg-black/5"
                    >
                        <span className="sr-only">Chọn file .eml</span>
                    </button>
                </div>

                <button
                    type="button"
                    onClick={openFileDialog}
                    className="px-8 py-4 bg-sky-600 text-white rounded-2xl font-bold hover:bg-sky-700 transition shadow-md"
                >
                    Chọn file .eml...
                </button>

                <button
                    onClick={handleUpload}
                    disabled={!selectedFile || loading}
                    className={`relative px-12 py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all duration-300 overflow-hidden
                        ${selectedFile && !loading ? 'bg-green-500 text-white shadow-xl shadow-green-500/30 hover:-translate-y-1 active:scale-95' : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'}`}
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {loading ? <i className="bx bx-loader-alt bx-spin text-lg" /> : t('tools.checkers.analyze_btn')}
                    </span>
                    {selectedFile && !loading && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                    )}
                </button>
            </div>
        </div>
    );
};

export default EmailChecker;