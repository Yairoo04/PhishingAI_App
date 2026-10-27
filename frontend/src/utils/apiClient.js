/**
 * apiClient.js
 * 
 * A reusable API client with an automatic failover mechanism.
 * It will attempt to request from the Primary server first,
 * and if the request fails (network error, timeout), it retries on the Fallback server.
 */

const PRIMARY_SERVER = 'https://phd.infoseclab.id.vn';
const FALLBACK_SERVER = 'https://phishingai.holegioi.app';

/**
 * Enhanced fetch wrapper with automatic Server Failover
 * 
 * @param {string} endpoint - The API route (e.g., '/api/darkweb/check')
 * @param {object} options - Standard fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>} - The standard fetch response promise
 */
export const fetchWithFailover = async (endpoint, options = {}) => {
    // Normalize endpoint (ensure it starts with '/')
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    try {
        console.log(`[API Client] Calling Primary Server: ${PRIMARY_SERVER}${normalizedEndpoint}`);
        const response = await fetch(`${PRIMARY_SERVER}${normalizedEndpoint}`, options);
        
        // If response is successful, or is a standard API error (like 400 Bad Request),
        // we return it directly instead of failover. We only failover on 5xx or network errors.
        if (response.ok || (response.status >= 400 && response.status < 500)) {
            return response;
        }

        console.warn(`[API Client] Primary server returned ${response.status}. Attempting Failover.`);
        throw new Error('Primary server returned an error status.');
        
    } catch (error) {
        console.warn(`[API Client] Primary Server Failed. Switching to Fallback Server: ${FALLBACK_SERVER}${normalizedEndpoint}`, error);

        // Fallback Request
        try {
            const fallbackResponse = await fetch(`${FALLBACK_SERVER}${normalizedEndpoint}`, options);
            return fallbackResponse;
        } catch (fallbackError) {
            console.error('[API Client] Both Primary and Fallback servers failed.', fallbackError);
            throw fallbackError; // If both fail, throw the error up to the component UI
        }
    }
};

export default fetchWithFailover;
