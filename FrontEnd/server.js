class server {
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
            await this.pullAllFromServer();
            console.log('pulled from server')
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

    // ========== MAIN SYNC FUNCTION ==========

    async sync() {
        console.log('🔄 Starting sync...');
        
        // Step 1: Push all local data to server
        console.log('📤 Pushing local data to server...');
        const pushResult = await this.pushAllToServer();
        
        // Step 2: Pull all data from server
        console.log('📥 Pulling data from server...');
        const pullResult = await this.pullAllFromServer();
        
        console.log('✓ Sync complete', { 
            pushed: pushResult, 
            pulled: pullResult 
        });
        
        return { pushResult, pullResult };
    }

    // ========== PUSH TO SERVER ==========

    async pushAllToServer() {
        const allPolygons = this.collectAllPolygons();
        const allModels = this.collectAllModels();
        
        // CHANGED: We need to push polygons and models separately
        // since your backend doesn't have a single /sync/push endpoint
        
        const results = {
            polygons: { success: false, error: null },
            models: { success: false, error: null }
        };
        
        try {
            // Push polygons
            for (const polygon of allPolygons) {
                const resp = await fetch(`${this.apiBase}/api/data/polygons`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(polygon)
                });
                
                if (!resp.ok) {
                    const errorText = await resp.text();
                    console.warn('Failed to push polygon:', resp.status, errorText);
                    results.polygons.error = `HTTP ${resp.status}: ${errorText}`;
                    break;
                }
            }
            results.polygons.success = true;
            
            // Push models
            for (const model of allModels) {
                const resp = await fetch(`${this.apiBase}/api/data/models`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(model)
                });
                
                if (!resp.ok) {
                    const errorText = await resp.text();
                    console.warn('Failed to push model:', resp.status, errorText);
                    results.models.error = `HTTP ${resp.status}: ${errorText}`;
                    break;
                }
            }
            results.models.success = true;
            
            console.log(`✓ Pushed ${allPolygons.length} polygons, ${allModels.length} models`);
            return { success: true, results };
        } catch (err) {
            console.error('Error pushing data:', err);
            return { success: false, error: err.message };
        }
    }

    collectAllPolygons() {
        const allEntities = this.viewer.entities.values;
        const polygonEntities = allEntities.filter(e => 
            e.polygon && !e.properties?.isVertex
        );
        
        return polygonEntities.map(entity => {
            const positions = this.getPositions(entity.polygon.hierarchy);
            const coordinates = positions.map(pos => {
                const carto = Cesium.Cartographic.fromCartesian(pos);
                return {
                    longitude: Cesium.Math.toDegrees(carto.longitude),
                    latitude: Cesium.Math.toDegrees(carto.latitude)
                };
            });

            const height = entity.polygon.extrudedHeight?._value ?? 
                          entity.polygon.extrudedHeight ?? 
                          0;

            const type = entity.properties?.polygonType ?? 
                        (typeof getEntityType === 'function' ? getEntityType(entity) : 'DEFAULT');

            return {
                id: entity.properties?.serverId ?? null,
                coordinates,
                height: height || 0,
                type: type || 'DEFAULT'
            };
        });
    }

    collectAllModels() {
        const models = [];
        const primitives = this.viewer.scene.primitives;
        
        for (let i = 0; i < primitives.length; i++) {
            const prim = primitives.get(i);
            if (prim instanceof Cesium.Model && prim.modelMatrix) {
                const position = this.getModelPosition(prim);
                if (!position) continue;

                models.push({
                    id: prim.serverId ?? null,
                    longitude: position.lon,
                    latitude: position.lat,
                    height: prim.modelHeight ?? 0,
                    rotation: prim.modelRotation ?? 0,
                    scale: prim.modelScale ?? 1.0,
                    type: prim.buildType ?? 'DEFAULT',
                    modelKey: prim.modelKey ?? 'unknown'
                });
            }
        }
        
        return models;
    }

    getModelPosition(model) {
        try {
            const position = Cesium.Matrix4.getTranslation(model.modelMatrix, new Cesium.Cartesian3());
            const carto = Cesium.Cartographic.fromCartesian(position);
            return {
                lon: Cesium.Math.toDegrees(carto.longitude),
                lat: Cesium.Math.toDegrees(carto.latitude)
            };
        } catch (e) {
            return null;
        }
    }

    // ========== PULL FROM SERVER ==========

    async pullAllFromServer() {
        try {
            // CHANGED: Now fetching from /api/data which returns both polygons and models
            const resp = await fetch(`${this.apiBase}/api/data`, {
                method: 'GET',
                cache: 'no-store'
            });

            if (!resp.ok) {
                const errorText = await resp.text();
                console.warn('Failed to pull data:', resp.status, errorText);
                return { success: false, error: `HTTP ${resp.status}: ${errorText}` };
            }

            const data = await resp.json();
            
            // Clear existing server data
            this.clearServerData();
            
            // Render polygons
            if (Array.isArray(data.polygons)) {
                data.polygons.forEach(p => this.renderServerPolygon(p));
                console.log(`✓ Loaded ${data.polygons.length} polygons`);
            }
            
            // Render models
            if (Array.isArray(data.models)) {
                // Wait for all models to be preloaded before spawning
                await this.ensureModelsPreloaded(data.models);
                
                for (const m of data.models) {
                    await this.renderServerModel(m);
                }
                console.log(`✓ Loaded ${data.models.length} models`);
            }

            return { 
                success: true, 
                polygons: data.polygons?.length || 0,
                models: data.models?.length || 0
            };
        } catch (err) {
            console.error('Error pulling data:', err);
            return { success: false, error: err.message };
        }
    }

    async ensureModelsPreloaded(models) {
        if (typeof window.preloadModels !== 'function') {
            console.warn('preloadModels function not available');
            return;
        }

        const uniqueKeys = [...new Set(models.map(m => m.modelKey).filter(Boolean))];
        const availableKeys = typeof window.getAllModelIDs === 'function' 
            ? window.getAllModelIDs() 
            : [];

        for (const key of uniqueKeys) {
            if (!availableKeys.includes(key)) {
                console.warn(`Model key '${key}' is not preloaded. Make sure to preload it first.`);
            }
        }
    }

    clearServerData() {
        // Clear polygons
        this.serverPolygonEntities.forEach(entity => {
            try { this.viewer.entities.remove(entity); } catch (e) {}
        });
        this.serverPolygonEntities.clear();
        
        // Clear models
        this.serverModelPrimitives.forEach(model => {
            try { this.viewer.scene.primitives.remove(model); } catch (e) {}
        });
        this.serverModelPrimitives.clear();
    }

    renderServerPolygon(p) {
        if (!p || !p.coordinates) return;
        
        const id = p.id != null ? p.id : Math.random();

        const degreesArray = [];
        p.coordinates.forEach(c => {
            const lon = c.longitude ?? c.lng ?? c.lon;
            const lat = c.latitude ?? c.lat;
            if (lon != null && lat != null) {
                degreesArray.push(lon);
                degreesArray.push(lat);
            }
        });

        if (degreesArray.length < 6) return; // need at least 3 points

        const entity = this.viewer.entities.add({
            id: 'server-polygon-' + id,
            name: (p.type || 'server-polygon') + (p.id ? ` (${p.id})` : ''),
            polygon: {
                hierarchy: Cesium.Cartesian3.fromDegreesArray(degreesArray),
                material: new Cesium.ColorMaterialProperty(
                    Cesium.Color.fromCssColorString('#eeff00ff').withAlpha(1)
                ),
                extrudedHeight: (p.height && !isNaN(p.height)) ? p.height : undefined,
                height: 0,
                classificationType: Cesium.ClassificationType.BOTH
            },
            properties: {
                isServerPolygon: true,
                serverId: id,
                polygonType: p.type || 'DEFAULT'
            }
        });

        this.serverPolygonEntities.set(id, entity);
    }

    async renderServerModel(m) {
        if (!m || m.longitude == null || m.latitude == null) return;
        
        const id = m.id != null ? m.id : Math.random();
        
        // Use spawnModel if available
        let model;
        if (typeof window.spawnModel === 'function' && m.modelKey) {
            try {
                model = await window.spawnModel(
                    m.modelKey,
                    { lon: m.longitude, lat: m.latitude },
                    m.height ?? 0,
                    m.rotation ?? 0,
                    {
                        scale: m.scale ?? 1.0,
                        buildType: m.type ?? 'DEFAULT'
                    }
                );
            } catch (err) {
                console.error(`Failed to spawn model '${m.modelKey}':`, err);
                return;
            }
        } else {
            console.warn('spawnModel function not available or modelKey missing');
            return;
        }
        
        if (model) {
            model.serverId = id;
            model.isServerModel = true;
            
            this.serverModelPrimitives.set(id, model);
        }
    }

    // ========== UTILITIES ==========

    getPositions(hierarchy) {
        if (hierarchy instanceof Cesium.CallbackProperty) {
            hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
        }
        if (typeof hierarchy.getValue === 'function') {
            hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
        }
        if (hierarchy instanceof Cesium.PolygonHierarchy) {
            return hierarchy.positions;
        }
        return hierarchy.positions || (Array.isArray(hierarchy) ? hierarchy : []);
    }

    destroy() {
        this.stopConnectionPolling();
        this.clearServerData();
    }
}

// Auto-initialize if viewer exists globally
if (typeof viewer !== 'undefined') {
    window.server = new server(viewer);
    console.log('✓ client-side server support initialized');
}