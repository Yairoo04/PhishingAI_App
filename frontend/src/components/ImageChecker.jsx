import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const ImageChecker = ({ setLoading, onResult }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFile = (file) => {
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target.result);
            reader.readAsDataURL(file);
        } else {
            alert(t('tools.checkers.scan_failed'));
            setSelectedFile(null);
            setPreview(null);
        }

        if (fileInputRef.current) fileInputRef.current.value = ""; // reset
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const openFileDialog = () => {
        if (fileInputRef.current) {
            console.time('image-open-dialog'); // debug thời gian
            fileInputRef.current.value = "";
            fileInputRef.current.click();
            console.timeEnd('image-open-dialog');
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append('file', selectedFile);

        setLoading(true);
        try {
            const response = await fetch('/api/image/predict', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Server error');
            const data = await response.json();
            onResult({ ...data, filename: selectedFile.name }, data.features || null);
        } catch (error) {
            console.error('Image upload error:', error);
            alert(t('tools.checkers.scan_failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-purple-500 bg-opacity-10 text-purple-500 mb-6 shadow-lg shadow-purple-500/10 border border-purple-500/20">
                    <i className="bx bx-image-alt text-5xl" />
                </div>
                <h3 className="text-2xl font-black mb-3 tracking-tight" style={{ color: theme.text }}>
                    {t('tools.checkers.image_title')}
                </h3>
                <p className="text-sm opacity-60 max-w-md mx-auto leading-relaxed" style={{ color: theme.text }}>
                    {t('tools.desc.image')}
                </p>
            </div>

            <div className="flex flex-col gap-6">
                <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />

                {/* Drop zone */}
                <div
                    onClick={openFileDialog}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
                    }}
                    className={`group relative flex flex-col items-center gap-4 w-full p-12 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden
                        ${isDragging ? 'border-purple-500 bg-purple-500/5 scale-[1.02]' : 'hover:border-purple-500/50 hover:bg-purple-500/[0.02]'}`}
                    style={{
                        borderColor: isDragging ? '#a855f7' : theme.border,
                        background: theme.bgCard2
                    }}
                >
                    <div className="p-4 rounded-2xl bg-opacity-10 text-purple-500 group-hover:scale-110 transition-transform duration-300" style={{ background: '#a855f7' }}>
                        <i className={`bx ${selectedFile ? 'bx-image-add scale-125' : 'bx-camera'} text-4xl`} />
                    </div>
                    <div className="z-10 text-center pointer-events-none">
                        <span className="block font-black text-base mb-1" style={{ color: theme.text }}>
                            {selectedFile ? selectedFile.name : t('tools.checkers.drop_desc')}
                        </span>
                        <span className="text-[10px] uppercase font-black tracking-widest opacity-40" style={{ color: theme.text }}>
                            {t('tools.checkers.max_size')} (PNG/JPG/WEBP)
                        </span>
                    </div>
                </div>

                {/* Button riêng (nên dùng nếu overlay vẫn lag) */}
                <button
                    type="button"
                    onClick={openFileDialog}
                    className="px-8 py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition shadow-md"
                >
                    Chọn ảnh từ máy...
                </button>

                <AnimatePresence>
                    {preview && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 rounded-3xl bg-black/20 border border-white/5 relative group">
                                <img src={preview} alt="Preview" className="w-full h-48 object-contain rounded-2xl" />
                                <button
                                    onClick={() => { setPreview(null); setSelectedFile(null); }}
                                    className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <i className="bx bx-x text-xl" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    onClick={handleUpload}
                    disabled={!selectedFile}
                    className={`relative px-12 py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all duration-300 overflow-hidden
                        ${selectedFile ? 'bg-green-500 text-white shadow-xl shadow-green-500/30 hover:-translate-y-1 active:scale-95' : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'}`}
                >
                    <span className="relative z-10">{t('tools.checkers.analyze_btn')}</span>
                    {selectedFile && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                    )}
                </button>
            </div>
        </div>
    );
};

export default ImageChecker;