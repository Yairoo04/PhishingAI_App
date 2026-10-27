import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';

// Layout
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';

// Pages
import Home from './pages/Home';
import PhishingTools from './pages/PhishingTools';
import MalwareTools from './pages/MalwareTools';
import Dashboard from './pages/Features/Dashboard';
import ScanHistory from './pages/Features/ScanHistory';
import ThreatEducation from './pages/Features/ThreatEducation';
import ExtensionDownload from './pages/Features/ExtensionDownload';
import APIAccess from './pages/Features/APIAccess';
import QRScanner from './pages/Features/QRScanner';
import DomainLookup from './pages/Features/DomainLookup';
import BrandImpersonation from './pages/Features/BrandImpersonation';
import CommunityReport from './pages/Features/CommunityReport';
import ScreenshotAnalyzer from './pages/Features/ScreenshotAnalyzer';
import UserAccount from './pages/Features/UserAccount';
import DarkWebChecker from './pages/Features/DarkWebChecker';
import PrivacyPolicy from './pages/Features/PrivacyPolicy';

const App = () => {
    return (
        <ThemeProvider>
            <Router>
                <div className="min-h-screen flex flex-col transition-colors duration-300">

                    <Navbar />

                    {/* Add padding for fixed navbar */}
                    <main className="flex-1 pt-24">
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/phishing" element={<PhishingTools />} />
                            <Route path="/malware" element={<MalwareTools />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/history" element={<ScanHistory />} />
                            <Route path="/education" element={<ThreatEducation />} />
                            <Route path="/extension" element={<ExtensionDownload />} />
                            <Route path="/api-access" element={<APIAccess />} />
                            <Route path="/qr-scanner" element={<QRScanner />} />
                            <Route path="/domain-lookup" element={<DomainLookup />} />
                            <Route path="/brand-impersonation" element={<BrandImpersonation />} />
                            <Route path="/report" element={<CommunityReport />} />
                            <Route path="/screenshot" element={<ScreenshotAnalyzer />} />
                            <Route path="/account" element={<UserAccount />} />
                            <Route path="/darkweb" element={<DarkWebChecker />} />
                            <Route path="/privacy" element={<PrivacyPolicy />} />
                        </Routes>
                    </main>

                    <Footer />

                </div>
            </Router>
        </ThemeProvider>
    );
};

export default App;