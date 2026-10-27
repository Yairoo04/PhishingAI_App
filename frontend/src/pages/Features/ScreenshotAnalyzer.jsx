import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const ScreenshotAnalyzer = () => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
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
        } else {
            setError(t('errors.invalid_file_type', 'Định dạng tệp không hợp lệ. Vui lòng chọn ảnh.'));
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

    const handleAnalyze = async () => {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append('file', selectedFile);

        setAnalyzing(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/image/predict', { method: 'POST', body: formData });
            const data = await response.json();
            
            if (!response.ok) {
                setError(data.error || t('tools.checkers.scan_failed', 'Gặp lỗi trong quá trình phân tích.'));
                return;
            }

            if (data.type === "image" || data.type === "qr_codes") {
                // Handle the case where the user uploaded a QR code instead of a simple screenshot
                // but we will display what the API gives us. If it contains results array (qr_codes), use the first one, or use the object itself.
                if (data.results && data.results.length > 0) {
                    setResult(data.results[0]); 
                } else {
                    setResult(data);
                }
            } else {
                setError(t('tools.checkers.scan_failed', 'Không thể phân tích ảnh đã chọn.'));
            }
        } catch (err) {
            console.error(err);
            setError(t('errors.network', 'Lỗi kết nối máy chủ.'));
        } finally {
            setAnalyzing(false);
        }
    };

    // Determine values correctly handles both QR responses and Image predictions layout
    const isPhishing = result?.prediction?.toLowerCase() === 'phishing';
    const riskLabel = isPhishing ? t('results.phishing', 'Nguy Hiểm (Phishing)') : t('results.safe', 'An Toàn');
    const probability = isPhishing ? result?.phishing_probability : result?.legitimate_probability;

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, paddingTop: '80px', paddingBottom: '60px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px' }}>
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ width: '3px', height: '20px', background: '#8b5cf6', borderRadius: '2px' }} />
                        <span style={{ color: '#8b5cf6', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('features.screenshot.badge')}</span>
                    </div>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, color: theme.text, margin: 0 }}>{t('features.screenshot.title')} <span style={{ color: '#8b5cf6' }}>{t('features.screenshot.title_hl')}</span></h1>
                    <p style={{ color: theme.textMuted, fontSize: '13px', marginTop: '4px' }}>{t('features.screenshot.desc')}</p>
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
                        borderRadius: '20px', 
                        padding: '60px 40px', 
                        textAlign: 'center', 
                        marginBottom: '32px',
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
                            >
                                <i className="bx bx-image-add" style={{ fontSize: '64px', color: theme.textFaint, marginBottom: '20px', display: 'block' }} />
                                <h3 style={{ color: theme.text, fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                                    {selectedFile ? selectedFile.name : t('features.screenshot.upload_title', 'Tải ảnh chụp màn hình')}
                                </h3>
                                <p style={{ color: theme.textDim, fontSize: '14px', marginBottom: '24px' }}>
                                    {t('features.screenshot.upload_desc', 'Kéo thả hoặc nhấn vào đây để chọn ảnh.')}
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="image-preview"
                                initial={{ opacity: 0, scale: 0.9 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                exit={{ opacity: 0 }}
                                style={{ position: 'relative', display: 'inline-block' }}
                            >
                                <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '350px', borderRadius: '16px', border: `1px solid ${theme.border}` }} />
                                {analyzing && (
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className="bx bx-loader-alt bx-spin" style={{ fontSize: '50px', color: '#fff' }} />
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {(!analyzing && !result) && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!selectedFile) {
                                    openFileDialog();
                                } else {
                                    handleAnalyze();
                                }
                            }} 
                            style={{ 
                                padding: '12px 32px', 
                                borderRadius: '8px', 
                                background: '#8b5cf6', 
                                color: '#fff', 
                                border: 'none', 
                                fontWeight: 700, 
                                cursor: 'pointer',
                                marginTop: preview ? '20px' : '0',
                                boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {selectedFile ? t('common.analyze_btn', 'Phân Tích Ngay') : t('features.screenshot.select_file', 'Chọn Tệp Ảnh')}
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            style={{ marginBottom: '32px', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', color: '#ef4444' }}
                        >
                            <i className="bx bx-error-circle" style={{ marginRight: '8px' }}></i>
                            {error}
                        </motion.div>
                    )}

                    {result && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            style={{ marginBottom: '32px', textAlign: 'left' }}
                        >
                            <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ margin: '0 0 24px', color: theme.text, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="bx bx-scan"></i> {t('results.analysis_title', 'Kết Quả Quét Ảnh')}
                                </h3>
                                
                                {result.qr_url && (
                                    <div style={{ marginBottom: '24px', padding: '16px', background: theme.bg, borderRadius: '12px', wordBreak: 'break-all' }}>
                                        <span style={{ display: 'block', fontSize: '12px', color: theme.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                                            URL Trích Xuất Từ QR
                                        </span>
                                        <a href={result.qr_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500, fontSize: '15px' }}>
                                            {result.qr_url}
                                        </a>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '200px', padding: '20px', borderRadius: '16px', background: isPhishing ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', border: `1px solid ${isPhishing ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}` }}>
                                        <span style={{ display: 'block', fontSize: '12px', color: theme.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                                            Mức Độ Nguy Hiểm
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <i className={`bx ${isPhishing ? 'bx-error text-red-500' : 'bx-check-shield text-green-500'}`} style={{ fontSize: '32px', color: isPhishing ? '#ef4444' : '#22c55e' }}></i>
                                            <div>
                                                <div style={{ fontSize: '24px', fontWeight: 800, color: isPhishing ? '#ef4444' : '#22c55e', textTransform: 'capitalize' }}>
                                                    {riskLabel}
                                                </div>
                                                <div style={{ fontSize: '13px', color: theme.textDim, marginTop: '2px' }}>
                                                    Tỷ lệ chuẩn đoán: {probability}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, minWidth: '200px', padding: '20px', borderRadius: '16px', background: theme.bg, border: `1px solid ${theme.border}` }}>
                                        <span style={{ display: 'block', fontSize: '12px', color: theme.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                                            Mô Hình Phân Tích
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <i className="bx bx-chip" style={{ fontSize: '28px', color: '#8b5cf6' }}></i>
                                            <div style={{ fontSize: '16px', fontWeight: 700, color: theme.text }}>
                                                {result.model === 'efficientnetv2m_phishing' ? 'EfficientNetV2-M' : (result.model || 'Unknown')}
                                                <div style={{ fontSize: '12px', color: theme.textDim, fontWeight: 500, marginTop: '2px' }}>
                                                    {result.type === 'qr_codes' ? 'Stacking URL Model' : 'Deep Image Analysis'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {[
                        { icon: 'bx-scan', title: t('features.screenshot.f1_title'), desc: t('features.screenshot.f1_desc') },
                        { icon: 'bx-bullseye', title: t('features.screenshot.f2_title'), desc: t('features.screenshot.f2_desc') },
                        { icon: 'bx-layout', title: t('features.screenshot.f3_title'), desc: t('features.screenshot.f3_desc') },
                    ].map((f, i) => (
                        <div key={i} style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '20px' }}>
                            <i className={`bx ${f.icon}`} style={{ fontSize: '24px', color: '#8b5cf6', marginBottom: '16px', display: 'block' }} />
                            <h4 style={{ color: theme.text, fontWeight: 700, marginBottom: '8px', fontSize: '15px' }}>{f.title}</h4>
                            <p style={{ color: theme.textMuted, fontSize: '12px', lineHeight: 1.5 }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ScreenshotAnalyzer;
