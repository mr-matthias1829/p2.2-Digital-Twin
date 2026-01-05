class serverPoller {
    constructor(viewer, apiBaseUrl = 'http://localhost:8081') {
        this.viewer = viewer;
        this.apiBase = apiBaseUrl;
        this.serverPolygonEntities = new Map(); // serverId -> entity
        this.serverModelPrimitives = new Map(); // serverId -> model primitive
        this.connectionPollInterval = null;
        this.isConnected = false;
        
        // Expose globally for backward compatibility
        window.serverEntities = this.serverPolygonEntities;
        window.checkPolygonsConnection = (manual) => this.checkConnection(manual);
        
        this.startConnectionPolling();
    }

    // ========== CONNECTION MONITORING ==========

    async startConnectionPolling() {
        await this.checkConnection(false);
        if (this.isConnected) {
            console.log('pulling')
        }
        if (this.connectionPollInterval) clearInterval(this.connectionPollInterval);
        this.connectionPollInterval = setInterval(() => this.checkConnection(false), 10000);
    }

    stopConnectionPolling() {
        if (this.connectionPollInterval) {
            clearInterval(this.connectionPollInterval);
            this.connectionPollInterval = null;
        }
    }

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