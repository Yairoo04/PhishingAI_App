import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const QRScanner = () => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFile = (file) => {
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file);
            setResult(null);
            setError(null);
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target.result);
            reader.readAsDataURL(file);
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

    const handleScan = async () => {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append('file', selectedFile);

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/image/predict', { method: 'POST', body: formData });
            const data = await response.json();
            
            if (!response.ok) {
                setError(data.error || t('tools.checkers.scan_failed', 'Gặp lỗi trong quá trình quét.'));
                return;
            }

            if (data.type === "qr_codes" && data.results && data.results.length > 0) {
                setResult(data.results[0]); 
            } else {
                setError(t('features.qr.no_qr_found', 'Không tìm thấy URL hợp lệ hoặc mã QR nào trong ảnh.'));
            }
        } catch (err) {
            console.error(err);
            setError(t('errors.network', 'Lỗi kết nối máy chủ.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, paddingTop: '80px', paddingBottom: '60px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <div style={{ width: '3px', height: '20px', background: '#8b5cf6', borderRadius: '2px' }} />
                        <span style={{ color: '#8b5cf6', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
                            {t('features.qr.badge')}
                        </span>
                    </div>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, color: theme.text, margin: 0 }}>
                        {t('features.qr.title')} <span style={{ color: '#8b5cf6' }}>{t('features.qr.title_hl')}</span>
                    </h1>
                    <p style={{ color: theme.textMuted, fontSize: '13px', marginTop: '4px' }}>
                        {t('features.qr.desc')}
                    </p>
                </div>

                {/* Upload Area */}
                <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />

                <div 
                    onClick={openFileDialog}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
                    }}
                    style={{ 
                        background: isDragging ? theme.bgCard : theme.bgCard2, 
                        border: `2px dashed ${isDragging ? '#8b5cf6' : theme.border}`, 
                        borderRadius: '24px', 
                        padding: '40px', 
                        cursor: 'pointer',
                        transition: 'all 0.3s' 
                    }}
                >
                    <AnimatePresence mode="wait">
                        {!preview ? (
                            <motion.div 
                                key="upload-prompt"
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                            >
                                <div style={{ width: '120px', height: '120px', marginBottom: '20px', border: `2px solid ${theme.border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    <i className="bx bx-qr-scan" style={{ fontSize: '60px', color: theme.textFaint }} />
                                </div>
                                <span style={{ color: theme.text, fontWeight: 700, fontSize: '16px' }}>
                                    {selectedFile ? selectedFile.name : t('tools.checkers.drop_desc', 'Click hoặc kéo thả ảnh chứa mã QR vào đây')}
                                </span>
                                <span style={{ color: theme.textMuted, fontSize: '11px', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    PNG, JPG, JPEG, WEBP
                                </span>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="image-preview"
                                initial={{ opacity: 0, scale: 0.9 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                exit={{ opacity: 0 }}
                                style={{ position: 'relative', display: 'inline-block' }}
                            >
                                <img src={preview} alt="QR Preview" style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '16px', border: `1px solid ${theme.border}` }} />
                                {loading && (
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className="bx bx-loader-alt bx-spin" style={{ fontSize: '40px', color: '#fff' }} />
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div style={{ marginTop: '24px' }}>
                    <button 
                        onClick={handleScan} 
                        disabled={!selectedFile || loading}
                        style={{ 
                            padding: '14px 40px', 
                            borderRadius: '12px', 
                            background: !selectedFile || loading ? theme.bgCard : '#8b5cf6', 
                            color: !selectedFile || loading ? theme.textMuted : '#fff', 
                            border: `1px solid ${!selectedFile ? theme.border : '#8b5cf6'}`, 
                            fontWeight: 700, 
                            fontSize: '16px', 
                            cursor: !selectedFile || loading ? 'not-allowed' : 'pointer', 
                            transition: 'all 0.2s', 
                            boxShadow: selectedFile && !loading ? '0 4px 12px rgba(139,92,246,0.3)' : 'none' 
                        }}
                    >
                        {loading ? t('common.loading', 'Đang phân tích...') : t('features.qr.start', 'Kiểm Tra QR')}
                    </button>
                    {!selectedFile && (
                        <p style={{ color: theme.textDim, fontSize: '12px', marginTop: '16px' }}>
                            {t('features.qr.upload_alt', 'Hoặc tải ảnh lên để kiểm tra')}
                        </p>
                    )}
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            style={{ marginTop: '24px', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', color: '#ef4444' }}
                        >
                            <i className="bx bx-error-circle" style={{ marginRight: '8px' }}></i>
                            {error}
                        </motion.div>
                    )}

                    {result && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            style={{ marginTop: '32px', textAlign: 'left' }}
                        >
                            <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ margin: '0 0 24px', color: theme.text, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="bx bx-scan"></i> Kết Quả Phân Tích QR
                                </h3>
                                
                                <div style={{ marginBottom: '24px', padding: '16px', background: theme.bg, borderRadius: '12px', wordBreak: 'break-all' }}>
                                    <span style={{ display: 'block', fontSize: '12px', color: theme.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                                        URL Trích Xuất
                                    </span>
                                    <a href={result.qr_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500, fontSize: '15px' }}>
                                        {result.qr_url}
                                    </a>
                                </div>

                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '200px', padding: '20px', borderRadius: '16px', background: result.prediction === 'phishing' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', border: `1px solid ${result.prediction === 'phishing' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}` }}>
                                        <span style={{ display: 'block', fontSize: '12px', color: theme.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                                            Mức Độ Nguy Hiểm
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <i className={`bx ${result.prediction === 'phishing' ? 'bx-error text-red-500' : 'bx-check-shield text-green-500'}`} style={{ fontSize: '32px', color: result.prediction === 'phishing' ? '#ef4444' : '#22c55e' }}></i>
                                            <div>
                                                <div style={{ fontSize: '24px', fontWeight: 800, color: result.prediction === 'phishing' ? '#ef4444' : '#22c55e', textTransform: 'capitalize' }}>
                                                    {result.prediction === 'phishing' ? 'Nguy Hiểm (Phishing)' : 'An Toàn'}
                                                </div>
                                                <div style={{ fontSize: '13px', color: theme.textDim, marginTop: '2px' }}>
                                                    Tỷ lệ chuẩn đoán: {result.prediction === 'phishing' ? result.phishing_probability : result.legitimate_probability}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default QRScanner;
