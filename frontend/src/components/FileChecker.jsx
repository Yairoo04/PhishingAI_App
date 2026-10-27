import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

const FileChecker = ({ setLoading, loading, onResult }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFile = (file) => {
        if (file && file.name.toLowerCase().endsWith('.pdf')) {
            setSelectedFile(file);
        } else {
            alert(t('tools.checkers.scan_failed'));
            setSelectedFile(null);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const openFileDialog = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
            fileInputRef.current.click();
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append('file', selectedFile);

        setLoading(true);
        try {
            const response = await fetch('/api/file/predict', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Server error");
            }

            const data = await response.json();
            onResult({ ...data, filename: selectedFile.name }, data.features || null);
        } catch (error) {
            console.error('File upload error:', error);
            alert(t('tools.checkers.scan_failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-green-500 bg-opacity-10 text-green-500 mb-6 shadow-lg shadow-green-500/10 border border-green-500/20">
                    <i className="bx bxs-file-pdf text-5xl" />
                </div>
                <h3 className="text-2xl font-black mb-3 tracking-tight" style={{ color: theme.text }}>
                    {t('tools.checkers.pdf_title')}
                </h3>
                <p className="text-sm opacity-60 max-w-md mx-auto leading-relaxed" style={{ color: theme.text }}>
                    {t('tools.desc.file')}
                </p>
            </div>

            <div className="flex flex-col gap-6">
                <input
                    id="pdfUpload"
                    type="file"
                    accept="application/pdf,.pdf"
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
                        if (e.dataTransfer.files?.[0]) {
                            handleFile(e.dataTransfer.files[0]);
                        }
                    }}
                    className={`group relative flex flex-col items-center gap-4 w-full p-12 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden
                        ${isDragging ? 'border-green-500 bg-green-500/5 scale-[1.02]' : 'hover:border-green-500/50 hover:bg-green-500/[0.02]'}`}
                    style={{
                        borderColor: isDragging ? '#22c55e' : theme.border,
                        background: theme.bgCard2
                    }}
                >
                    <div className="p-4 rounded-2xl bg-opacity-10 text-green-500 group-hover:scale-110 transition-transform duration-300" style={{ background: '#22c55e' }}>
                        <i className={`bx ${selectedFile ? 'bx-file-find scale-125' : 'bx-upload'} text-4xl`} />
                    </div>
                    <div className="z-10 text-center pointer-events-none">
                        <span className="block font-black text-base mb-1" style={{ color: theme.text }}>
                            {selectedFile ? selectedFile.name : t('tools.checkers.drop_desc')}
                        </span>
                        <span className="text-[10px] uppercase font-black tracking-widest opacity-40" style={{ color: theme.text }}>
                            {t('tools.checkers.max_size')} (PDF Only)
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            openFileDialog();
                        }}
                        className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-20"
                    >
                        <span className="sr-only">Chọn file PDF</span>
                    </button>
                </div>

                <button
                    onClick={handleUpload}
                    disabled={!selectedFile || loading}
                    className={`relative px-12 py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all duration-300 overflow-hidden
                        ${selectedFile && !loading
                            ? 'bg-green-500 text-white shadow-xl shadow-green-500/30 hover:-translate-y-1 active:scale-95'
                            : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'}`}
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {loading ? (
                            <>
                                <i className="bx bx-loader-alt bx-spin text-lg"></i>
                                {t('tools.checkers.analyzing')}
                            </>
                        ) : (
                            t('tools.checkers.analyze_btn')
                        )}
                    </span>

                    {selectedFile && !loading && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                    )}
                </button>
            </div>
        </div>
    );
};

export default FileChecker;