/**
 * Monitors backend server connection status with periodic polling
 * Provides real-time connection status updates to the UI
 * @class serverPoller
 * @description Polls the Spring Boot API endpoint every 10 seconds to track connectivity
 * This helps users know when backend features (save, load, calculations) are available
 * @example
 * const poller = new serverPoller(); // localhost has a default defined, arguments optional
 * await poller.checkConnection(); // Manual check
 * // Poller automatically starts checking every 10 seconds
 */
class serverPoller {
    /**
     * Creates a server connection monitor
     * Automatically starts polling every 10 seconds
     * @param {string} [apiBaseUrl='http://localhost:8081'] - Spring Boot API base URL
     */
    constructor(apiBaseUrl = 'http://localhost:8081') {
        /** @type {string} API base URL (Spring Boot backend) */
        this.apiBase = apiBaseUrl;
        
        /** @type {Map} Unused - kept for backward compatibility */
        this.serverPolygonEntities = new Map();
        
        /** @type {Map} Unused - kept for backward compatibility */
        this.serverModelPrimitives = new Map();
        
        /** @type {number|null} Connection polling interval ID */
        this.connectionPollInterval = null;
        
        /** @type {boolean} Current connection status */
        this.isConnected = false;
        
        // Expose globally for backward compatibility
        window.serverEntities = this.serverPolygonEntities;
        window.checkPolygonsConnection = (manual) => this.checkConnection(manual);
        
        this.startConnectionPolling();
    }

    /**
     * Starts polling the server every 10 seconds
     * @async
     */
    async startConnectionPolling() {
        await this.checkConnection(false);
        if (this.isConnected) {
            console.log('pulling')
        }
        if (this.connectionPollInterval) clearInterval(this.connectionPollInterval);
        this.connectionPollInterval = setInterval(() => this.checkConnection(false), 10000);
    }

    /**
     * Stops connection polling
     */
    stopConnectionPolling() {
        if (this.connectionPollInterval) {
            clearInterval(this.connectionPollInterval);
            this.connectionPollInterval = null;
        }
    }

    /**
     * Checks if the backend server is reachable
     * @async
     * @param {boolean} [manualTrigger=false] - Whether this is a manual check
     * @returns {Promise<boolean>} True if connected, false otherwise
     */
    async checkConnection(manualTrigger = false) {
        // CHANGED: Now checking /api/data instead of /api/polygons
        const url = `${this.apiBase}/api/data`;
        const timeoutMs = 4000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const resp = await fetch(url, { signal: controller.signal, cache: 'no-store' });
            clearTimeout(timeoutId);
            
            if (!resp.ok) {
                const msg = `HTTP ${resp.status}`;
                this.isConnected = false;
                if (window.setConnectionStatus) window.setConnectionStatus('Disconnected', msg);
                console.warn('API responded with non-OK:', resp.status);
                return false;
            }

            let bodyText = '';
            try {
                const json = await resp.json();
                const polyCount = json.polygons?.length || 0;
                const modelCount = json.models?.length || 0;
                bodyText = `${polyCount} polygons, ${modelCount} models`;
            } catch (e) {
                bodyText = 'OK (non-JSON)';
            }

            this.isConnected = true;
            if (window.setConnectionStatus) {
                window.setConnectionStatus('Connected', bodyText + (manualTrigger ? ' (manual)' : ''));
            }
            return true;
        } catch (err) {
            clearTimeout(timeoutId);
            this.isConnected = false;
            
            let message = err.name === 'AbortError' 
                ? `Timeout after ${timeoutMs}ms` 
                : (err.message || String(err));

            if (window.setConnectionStatus) {
                let userMsg = message;
                if (message.toLowerCase().includes('failed to fetch') || 
                    message.toLowerCase().includes('networkrequestfailed')) {
                    userMsg = message + ' — Spring Boot server not detected';
                }
                window.setConnectionStatus('Disconnected', userMsg + (manualTrigger ? ' (manual)' : ''));
            }
            console.warn('Error checking API:', err);
            return false;
        }
    }
}

// Auto-initialize if viewer exists globally
if (typeof viewer !== 'undefined') {
    window.server = new server(viewer);
    console.log('✓ client-side server support initialized');
}