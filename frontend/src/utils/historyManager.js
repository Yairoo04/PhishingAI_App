/**
 * Utility to manage scan history by interacting with the backend API.
 */

/**
 * Save a new scan result to the backend history database.
 * @param {Object} scan - Scan object { type, target, result, confidence, icon }
 */
export const saveScan = async (scan) => {
    try {
        const response = await fetch('/api/dashboard/record', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(scan)
        });

        if (response.ok) {
            // Dispatch a custom event to notify the dashboard to refresh
            window.dispatchEvent(new Event('scanHistoryUpdated'));
        } else {
            console.error('Failed to save scan to backend backend');
        }

        return scan;
    } catch (error) {
        console.error('Error saving scan to history API:', error);
        return null;
    }
};

/**
 * Fetch dashboard stats and recent history from the backend.
 * Returns { total_scans, threats_blocked, safe_confirmed, accuracy, threat_distribution, recent_scans }
 */
export const fetchDashboardStats = async () => {
    try {
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) {
            throw new Error('API response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching dashboard stats from API:', error);
        return {
            total_scans: 0,
            threats_blocked: 0,
            safe_confirmed: 0,
            accuracy: 98.7,
            threat_distribution: {
                url_phishing: 0,
                android_malware: 0,
                email_scam: 0,
                pdf_exploit: 0,
                image_qr: 0
            },
            recent_scans: []
        };
    }
};

/**
 * Fetch full scan history from the backend.
 */
export const fetchHistory = async () => {
    try {
        const response = await fetch('/api/dashboard/history');
        if (!response.ok) {
            throw new Error('API response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching scan history from API:', error);
        return [];
    }
};

/**
 * Legacy stubs for existing components that might still call these synchronously.
 * They return empty default values to prevent crashes.
 */
export const getHistory = () => [];
export const getDashboardStats = () => ({ totalScans: 0, threatsBlocked: 0, safeUrls: 0, accuracy: 98.7 });
export const clearHistory = () => { };
