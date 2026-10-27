import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

const AndroidChecker = ({ setLoading, onResult }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [file, setFile] = useState(null);
    const [error, setError] = useState(null);
    const [dragging, setDragging] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setError(null);
        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        try {
            const response = await fetch('/api/android/predict', {
                method: 'POST',
                body: formData
            });

            const contentType = response.headers.get("content-type");
            let data = {};
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(`Invalid server response: ${text.substring(0, 50)}...`);
            }

            if (!response.ok) {
                throw new Error(data.error || `Server error: ${response.status}`);
            }

            if (data.error) {
                throw new Error(data.error);
            }

            const formattedResult = {
                ...data,
                filename: file.name,
                type: 'apk',
                phishing_probability: data.malware_probability || 0,
                legitimate_probability: data.legitimate_probability || 0,
            };

            onResult(formattedResult);
        } catch (err) {
            console.error('Scan failed:', err);
            setError(err.message || t('tools.checkers.scan_failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="text-center max-w-2xl mx-auto">
            <div className="mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-green-500 bg-opacity-10 text-green-500 mb-6 shadow-lg shadow-green-500/10 border border-green-500/20">
                    <i className="bx bxl-android text-5xl" />
                </div>
                <h3 className="text-2xl font-black mb-3 tracking-tight" style={{ color: theme.text }}>
                    {t('tools.checkers.apk_title')}
                </h3>
                <p className="text-sm opacity-60 max-w-md mx-auto leading-relaxed" style={{ color: theme.text }}>
                    {t('tools.desc.android')}
                </p>
            </div>

            <div className="flex flex-col items-center gap-6">
                {error && (
                    <div className="w-full p-4 rounded-xl border-l-4 border-red-500 bg-red-500/10 text-red-500 flex items-start gap-3 text-left">
                        <i className="bx bx-error-circle text-xl mt-0.5" />
                        <div>
                            <span className="block font-bold text-sm">Analysis Failed</span>
                            <span className="block text-xs opacity-80 mt-1">{error}</span>
                        </div>
                    </div>
                )}

                <input
                    type="file"
                    accept=".apk"
                    onChange={handleFileChange}
                    className="hidden"
                    id="apk-upload"
                />
                <label
                    htmlFor="apk-upload"
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileChange({ target: { files: e.dataTransfer.files } }); }}
                    className={`group relative flex flex-col items-center gap-4 w-full p-12 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden
                        ${dragging ? 'border-green-500 bg-green-500/5 scale-[1.02]' : 'hover:border-green-500/50 hover:bg-green-500/[0.02]'}`}
                    style={{
                        borderColor: dragging ? '#22c55e' : theme.border,
                        background: theme.bgCard2
                    }}
                >
                    <div className="p-4 rounded-2xl bg-opacity-10 text-green-500 group-hover:scale-110 transition-transform duration-300" style={{ background: '#22c55e' }}>
                        <i className={`bx ${file ? 'bx-check-double scale-125' : 'bx-cloud-upload'} text-4xl`} />
                    </div>
                    <div className="z-10 text-center">
                        <span className="block font-black text-base mb-1" style={{ color: theme.text }}>
                            {file ? file.name : t('tools.checkers.drop_desc')}
                        </span>
                        <span className="text-[10px] uppercase font-black tracking-widest opacity-40" style={{ color: theme.text }}>
                            {t('tools.checkers.max_size')}
                        </span>
                    </div>
                </label>

                <button
                    onClick={handleUpload}
                    disabled={!file}
                    className={`relative px-12 py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all duration-300 overflow-hidden
                        ${file ? 'bg-green-500 text-white shadow-xl shadow-green-500/30 hover:-translate-y-1 active:scale-95' : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'}`}
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

export default AndroidChecker;
