(function() {
    const API_BASE = 'http://localhost:8081';

    const saveQueue = new Map();

    function showSyncIndicator() {
        const indicator = document.getElementById('syncIndicator');
        if (indicator) indicator.style.display = 'block';
    }

    function hideSyncIndicator() {
        const indicator = document.getElementById('syncIndicator');
        if (indicator) indicator.style.display = 'none';
    }

    function entityToModelDTO(entity) {
        if (!entity.model) {
            console.error('Entity does not have a model');
            return null;
        }

        let hierarchy = entity.model.hierarchy;
        if (typeof hierarchy.getValue === 'function') {
            hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
        }

        let positions = [];
        if (hierarchy instanceof Cesium.ModelHierarchy) {
            positions = hierarchy.positions || [];
        } else if (Array.isArray(hierarchy)) {
            positions = hierarchy;
        } else if (hierarchy.positions) {
            positions = hierarchy.positions;
        }
        
        const coordinates = positions.map(pos => {
            const cartographic = Cesium.Cartographic.fromCartesian(pos);
            return {
                longitude: Cesium.Math.toDegrees(cartographic.longitude),
                latitude: Cesium.Math.toDegrees(cartographic.latitude)
            };
        });

        let height = 0.0;
        if (entity.model.extrudedHeight) {
            height = typeof entity.model.extrudedHeight.getValue === 'function'
            ? entity.model.extrudedHeight.getValue(Cesium.JulianDate.now())
            : entity.model.extrudedHeight;
        }

        let modelType = 'DEFAULT';
        if (entity.properties && entity.properties.buildType) {
            modelType = typeof entity.properties.buildType.getValue === 'function'
            ? entity.properties.buildType.getValue(Cesium.JulianDate.now())
            : entity.properties.buildType;
        }

        let personality = entity.personality || null;

        let modelKey = entity.modelKey || null;

        return {
            id: entity.modelId || null,
            coordinates: coordinates,
            height: height,
            modelType: modelType,
            personality: personality,
            modelKey: modelKey
        };
    }

    function modelDTOToEntity(modelDTO, viewer) {
        const positions = modelDTO.coordinates.map(coord =>
            Cesium.Cartesian3.fromDegrees(coord.longitude, coord.latitude)
        );

        const entity = viewer.entities.add({
            polygon: {
                hierarchy: new Cesium.PolygonHierarchy(positions),
                extrudedHeight: modelDTO.height || 0.0
            },
            properties: new Cesium.PropertyBag({
                buildType: modelDTO.modelType || 'DEFAULT'
            }),
            modelId: modelDTO.id,
            modelPersonality: modelDTO.personality || null,
            modelKey: modelDTO.modelKey || null
        });

        return entity;
    }

    async function saveModel(entity) {
        const modelId = entity.modelId;

        if (modelId && saveQueue.has(modelId)) {
            console.log(`⏳ Waiting for previous save to complete for model ${modelId}...`)
            try {
                await saveQueue.get(modelId);
            } catch (e) {

            }
        }

        const savePromise = performSave(entity);
        if (modelId) {
            saveQueue.set(modelId, savePromise);
        }

        try {
            const result = await savePromise;
            return result;
        } finally {
            if (modelId) {
                saveQueue.delete(modelId);
            }
        }
    }

    async function performSave(entity) {
        showSyncIndicator();
        try {
            const modelDTO = entityToModelDTO(entity);
            if (!modelDTO) {
                throw new Error('Failed to convert entity to model DTO');
            }

            const url = modelDTO.id
                ? `${API_BASE}/api/data/models/${modelDTO.id}`
                : `${API_BASE}/api/data/models`;

            const method = modelDTO.id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(modelDTO)
            });

            if (!response.ok) {
                throw new Error(`Failed to save model: HTTP ${response.status}`);
            }

            const savedModel = await response.json();

            entity.modelId = savedModel.id;

            console.log(`✓ Model ${method === 'POST' ? 'created' : 'updated'} with ID: ${savedModel.id}`)
            return savedModel;
        } catch (error) {
            console.error('Error saving model:', error);
            throw error;
        } finally {
            hideSyncIndicator();
        }
    }

    async function loadAllModels(viewer) {
        showSyncIndicator();
        try {
            const response = await fetch(`${API_BASE}/api/data/models`);

            if (!response.ok) {
                throw new Error(`Failed to load models: HTTP ${response.status}`);
            }

            const models = await response.json();

            console.log(`✓ Loading ${models.length} models from database...`);

            const entities = [];
            for (const modelDTO of models) {
                const entity = modelsDTOToEntity(modelDTO, viewer);
                entities.push(entity);
            }

            console.log(`✓ Loaded ${entities.length} models`);

            setTimeout(() => {
                removeDuplicateModels(viewer);
            }, 200);

            return entities;
        } catch (error) {
            console.error('Error loading models:', error);
            return [];
        } finally {
            hideSyncIndicator();
        }
    }

    function removeDuplicateModels(viewer) {
        const modelMap = new Map();
        const toRemove = [];

        viewer.entities.values.forEach(entity => {
            if (!entity.model || entity.properties?.isSpoordok) return;

            let hierarchy = entity.model.hierarchy;
            if (typeof hierarchy.getValue === 'function') {
                hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
            }

            let positions = [];
            if (hierarchy instanceof Cesium.ModelHierarchy) {
                positions = hierarchy.positions || [];
            } else if (Array.isArray(hierarchy)) {
                positions = hierarchy;
            }

            const coordHash = positions.map(pos => {
                const carto = Cesium.Cartographic.fromCartesian(pos);
                return `${carto.longitude.toFixed(8)},${carto.latitude.toFixed(8)}`;
            }).sort().join('|');

            if (modelMap.has(coordHash)) {
                const existing = modelMap.get(coordHash);
                if (entity.modelId && !existing.modelId) {
                    toRemove.push(existing);
                    modelMap.set(coordHash, entity);
                } else {
                    toRemove.push(entity);
                }
            } else {
                modelMap.set(coordHash, entity);
            }
        });

        if (toRemove.length > 0) {
            toRemove.forEach(entity => viewer.entities.remove(entity));
            console.log(`🗑️ Removed ${toRemove.length} duplicate model(s)`);

            if (typeof updateOccupationStats === 'function') {
                setTimeout(() => updateOccupationStats(), 100);
            }
        }
    }

    async function deleteModel(entity) {
        showSyncIndicator();
        try {
            if (!entity.modelId) {
                console.warn('Entity does not have a database ID, cannot delete');
                hideSyncIndicator();
                return false;
            }

            const response = await fetch(`${API_BASE}/api/data/models/${entity.modelId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Failed to delete model: HTTP ${response.status}`);
            }

            console.log(`✓ Model deleted with ID: ${entity.modelId}`);
            return true;
        } catch (error) {
            console.error('Error deleting polygon:', error);
            throw error;
        } finally {
            hideSyncIndicator();
        }
    }

    window.polygonAPI = {
        saveModel,
        loadAllModels,
        deleteModel,
        entityToModelDTO,
        modelDTOToEntity,
        removeDuplicateModels
    };
})();