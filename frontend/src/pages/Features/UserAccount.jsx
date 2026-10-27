import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const UserAccount = () => {
    const { t } = useTranslation();
    const { theme, darkMode } = useTheme();

    const TABS = [
        { id: 'profile', label: t('features.account.tab_profile'), icon: 'bx-user' },
        { id: 'security', label: t('features.account.tab_security'), icon: 'bx-lock-alt' },
        { id: 'notifications', label: t('features.account.tab_notifications'), icon: 'bx-bell' },
        { id: 'usage', label: t('features.account.tab_usage'), icon: 'bx-bar-chart-alt-2' },
    ];

    const [activeTab, setActiveTab] = useState('profile');
    const [profile, setProfile] = useState({ name: 'Nguyễn Văn A', email: 'vana@ptit.edu.vn', phone: '0901 234 567', role: 'Researcher', org: 'PTIT' });
    const [editing, setEditing] = useState(false);
    const [saved, setSaved] = useState(false);
    const handleSave = () => { setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000); };
    const fieldLabel = { name: 'Full Name', email: 'Email', phone: 'Phone', role: 'Role', org: 'Organization' };

    const inputBase = { width: '100%', background: theme.bgInput, border: `1px solid rgba(59,130,246,0.3)`, borderRadius: '4px', color: theme.text, padding: '9px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };
    const cardStyle = { background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '6px', boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' };

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, paddingTop: '80px', paddingBottom: '60px', transition: 'background 0.3s' }}>
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${theme.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridLine} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px', position: 'relative' }}>
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ width: '3px', height: '20px', background: '#3b82f6', borderRadius: '2px' }} />
                        <span style={{ color: '#3b82f6', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('features.account.badge')}</span>
                    </div>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, color: theme.text, margin: 0 }}>{t('features.account.title')} <span style={{ color: '#3b82f6' }}>{t('features.account.title_hl')}</span></h1>
                </div>

                {/* Avatar */}
                <div style={{ ...cardStyle, padding: '16px 20px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#fff', fontWeight: 800, fontSize: '22px' }}>{profile.name.charAt(0)}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ color: theme.text, fontWeight: 700, fontSize: '16px' }}>{profile.name}</div>
                        <div style={{ color: theme.textMuted, fontSize: '12px' }}>{profile.email}</div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                            <span style={{ fontSize: '9px', padding: '2px 8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa', borderRadius: '2px', fontWeight: 600 }}>{profile.role}</span>
                            <span style={{ fontSize: '9px', padding: '2px 8px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', borderRadius: '2px', fontWeight: 600 }}>{t('features.account.verified')}</span>
                        </div>
                    </div>
                    <button onClick={() => setEditing(!editing)} style={{ padding: '8px 14px', background: editing ? 'rgba(239,68,68,0.08)' : theme.badgeBg, border: `1px solid ${editing ? 'rgba(239,68,68,0.25)' : theme.border}`, borderRadius: '4px', color: editing ? '#f87171' : theme.textMuted, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <i className={`bx bx-${editing ? 'x' : 'edit'}`} style={{ fontSize: '14px' }} />{editing ? t('features.account.cancel') : t('features.account.edit')}
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: activeTab === tab.id ? 'rgba(59,130,246,0.08)' : theme.bgCard, border: `1px solid ${activeTab === tab.id ? 'rgba(59,130,246,0.35)' : theme.border}`, borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : `1px solid ${theme.border}`, borderRadius: '4px 4px 0 0', cursor: 'pointer', color: activeTab === tab.id ? '#60a5fa' : theme.textFaint, fontSize: '12px', fontWeight: 600 }}>
                            <i className={`bx ${tab.icon}`} style={{ fontSize: '15px' }} />{tab.label}
                        </button>
                    ))}
                </div>

                <div style={{ ...cardStyle, border: '1px solid rgba(59,130,246,0.15)', borderTop: 'none', borderRadius: '0 6px 6px 6px', padding: '20px' }}>
                    {activeTab === 'profile' && (
                        <div>
                            <div style={{ color: theme.textFaint, fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>{t('features.account.personal')}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {Object.entries(profile).map(([key, value]) => (
                                    <div key={key}>
                                        <label style={{ color: theme.textFaint, fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '5px', display: 'block' }}>{fieldLabel[key]}</label>
                                        {editing ? <input type="text" value={value} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))} style={inputBase} /> : <div style={{ color: theme.textSub, fontSize: '13px', padding: '9px 0', borderBottom: `1px solid ${theme.tableBorder}` }}>{value}</div>}
                                    </div>
                                ))}
                            </div>
                            {editing && <button onClick={handleSave} style={{ marginTop: '16px', padding: '10px 20px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.35)', borderRadius: '4px', color: '#60a5fa', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="bx bx-save" style={{ fontSize: '16px' }} /> {t('features.account.save')}
                            </button>}
                            {saved && <div style={{ marginTop: '10px', color: '#22c55e', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><i className="bx bx-check" style={{ fontSize: '14px' }} /> {t('features.account.saved')}</div>}
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div>
                            <div style={{ color: theme.textFaint, fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>{t('features.account.sec_settings')}</div>
                            {[{ icon: 'bx-key', title: t('features.account.pass'), sub: t('features.account.pass_sub'), action: t('features.account.change'), color: '#3b82f6' }, { icon: 'bx-mobile-alt', title: t('features.account.tfa'), sub: t('features.account.tfa_sub'), action: t('features.account.manage'), color: '#22c55e' }, { icon: 'bx-devices', title: t('features.account.sessions'), sub: t('features.account.sessions_sub'), action: t('features.account.view'), color: '#f59e0b' }].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderBottom: `1px solid ${theme.tableBorder}` }}>
                                    <div style={{ width: '36px', height: '36px', background: theme.badgeBg, border: `1px solid ${theme.border}`, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className={`bx ${item.icon}`} style={{ color: item.color, fontSize: '18px' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: theme.text, fontWeight: 600, fontSize: '13px' }}>{item.title}</div>
                                        <div style={{ color: theme.textDim, fontSize: '11px' }}>{item.sub}</div>
                                    </div>
                                    <button style={{ padding: '6px 12px', background: theme.badgeBg, border: `1px solid ${theme.border}`, borderRadius: '4px', color: theme.textFaint, fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>{item.action}</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div>
                            <div style={{ color: theme.textFaint, fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>{t('features.account.notif_pref')}</div>
                            {[{ label: t('features.account.n1'), sub: t('features.account.n1_sub'), on: true }, { label: t('features.account.n2'), sub: t('features.account.n2_sub'), on: true }, { label: t('features.account.n3'), sub: t('features.account.n3_sub'), on: false }, { label: t('features.account.n4'), sub: t('features.account.n4_sub'), on: true }].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${theme.tableBorder}` }}>
                                    <div>
                                        <div style={{ color: theme.text, fontWeight: 600, fontSize: '13px' }}>{item.label}</div>
                                        <div style={{ color: theme.textDim, fontSize: '11px' }}>{item.sub}</div>
                                    </div>
                                    <div style={{ width: '40px', height: '22px', background: item.on ? '#3b82f6' : theme.badgeBg, borderRadius: '11px', position: 'relative', cursor: 'pointer', border: `1px solid ${item.on ? '#3b82f6' : theme.border}`, flexShrink: 0 }}>
                                        <div style={{ position: 'absolute', top: '2px', width: '16px', height: '16px', background: '#fff', borderRadius: '50%', left: item.on ? '20px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'usage' && (
                        <div>
                            <div style={{ color: theme.textFaint, fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>{t('features.account.usage_stat')}</div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                                {[{ icon: 'bx-link', label: t('features.account.u1'), value: '342', rgb: '16,185,129' }, { icon: 'bx-file-blank', label: t('features.account.u2'), value: '87', rgb: '245,158,11' }, { icon: 'bx-envelope', label: t('features.account.u3'), value: '156', rgb: '14,165,233' }, { icon: 'bx-shield', label: t('features.account.u4'), value: '23', rgb: '139,92,246' }].map((s, i) => (
                                    <div key={i} style={{ background: theme.panelBg, border: `1px solid ${theme.border}`, borderRadius: '4px', padding: '14px', textAlign: 'center' }}>
                                        <i className={`bx ${s.icon}`} style={{ color: `rgb(${s.rgb})`, fontSize: '22px', marginBottom: '6px', display: 'block' }} />
                                        <div style={{ color: theme.text, fontWeight: 800, fontSize: '20px' }}>{s.value}</div>
                                        <div style={{ color: theme.textDim, fontSize: '10px', textTransform: 'uppercase', marginTop: '2px' }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ background: theme.panelBg, border: `1px solid ${theme.border}`, borderRadius: '4px', padding: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                                    <span style={{ color: theme.textMuted }}>{t('features.account.api_usage')}</span>
                                    <span style={{ color: '#3b82f6', fontWeight: 700, fontFamily: 'monospace' }}>342 / 1,000</span>
                                </div>
                                <div style={{ height: '6px', background: theme.badgeBg, borderRadius: '2px' }}>
                                    <div style={{ height: '100%', width: '34.2%', background: '#3b82f6', borderRadius: '2px' }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserAccount;
