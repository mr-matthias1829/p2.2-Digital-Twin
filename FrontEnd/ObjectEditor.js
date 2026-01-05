class ObjectEditor {
    constructor(viewer) {
        this.viewer = viewer;
        this.editMode = false;
        this.editingEntity = null;
        this.editingModel = null;
        this.vertexEntities = [];
        this.originalMaterial = null;
        this.draggedVertex = null;
        this.hoveredVertex = null;
        this.moveStart = null;
        this.onEditModeChanged = null;
        this.setupKeyboardControls();
    }

    // Helper: mark certain entities as protected (not editable/moveable)
    isProtectedEntity(entity) {
        if (!entity) return false;
        try {
            if (entity.properties?.isSpoordok) return true;
            if (entity.name === 'Spoordok') return true;
        } catch (e) {}
        return false;
    }

    // === POLYGON EDITING ===

    startEditingPolygon(entity) {
        if (!entity.polygon) return console.log("No polygon found");
        // Only allow editing when in edit mode
        if (typeof drawingMode !== 'undefined' && drawingMode !== "edit") {
            return;
        }
        if (this.editMode) this.stopEditing();

        this.editMode = true;
        this.editingEntity = entity;
        this._emitEditModeChanged();

        // Protected polygons: show info only, no vertex editing
        if (this.isProtectedEntity(entity)) {
            console.log("Protected polygon — info only (no edit).");
            if (window.showPolygonInfo) window.showPolygonInfo(entity);
            return;
        }

        // Create vertex markers
        const positions = this.getPositions(entity.polygon.hierarchy);
        if (!positions.length) {
            console.error("No positions found!");
            return this.stopEditing();
        }

        positions.forEach((position, index) => {
        // Add small height offset to position vertices above polygon
        const cartographic = Cesium.Cartographic.fromCartesian(position);
        const elevatedPosition = Cesium.Cartesian3.fromRadians(
            cartographic.longitude,
            cartographic.latitude,
            cartographic.height + 0.2
        );
        
        this.vertexEntities.push(this.viewer.entities.add({
            point: {
                pixelSize: 20,
                color: Cesium.Color.RED,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 3,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
            
            },
            position: elevatedPosition,
            properties: { isVertex: true, vertexIndex: index }
            }));
        });
        
        console.log("📐 POLYGON EDIT MODE");
        if (window.showPolygonInfo) window.showPolygonInfo(entity);
    }

    rotatePolygon(degrees) {
        if (!this.editingEntity?.polygon) return;
        const positions = this.vertexEntities.map(v => 
            v.position.getValue ? v.position.getValue(Cesium.JulianDate.now()) : v.position
        );
        if (!positions.length) return;
        
        const center = positions.reduce((sum, pos) => 
            Cesium.Cartesian3.add(sum, pos, sum), new Cesium.Cartesian3()
        );
        Cesium.Cartesian3.divideByScalar(center, positions.length, center);
        
        const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);
        const rotation = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(degrees));
        const inverseTransform = Cesium.Matrix4.inverse(transform, new Cesium.Matrix4());
        
        const newPositions = positions.map(pos => {
            const localPos = Cesium.Matrix4.multiplyByPoint(inverseTransform, pos, new Cesium.Cartesian3());
            const rotatedLocal = Cesium.Matrix3.multiplyByVector(rotation, localPos, new Cesium.Cartesian3());
            return Cesium.Matrix4.multiplyByPoint(transform, rotatedLocal, new Cesium.Cartesian3());
        });
        
        this.vertexEntities.forEach((v, i) => v.position = newPositions[i]);
        this.updatePolygonFromVertices();
        console.log(`↻ Rotated ${degrees}°`);
    }

    updatePolygonFromVertices() {
        if (!this.editingEntity || !this.vertexEntities.length) return;
        const positions = this.vertexEntities.map(v => 
            v.position.getValue ? v.position.getValue(Cesium.JulianDate.now()) : v.position
        );
        this.editingEntity.polygon.hierarchy = new Cesium.PolygonHierarchy(positions);
        
        // Check bounds and mark if out of bounds
        if (typeof boundsChecker !== 'undefined') {
            boundsChecker.validateAndMarkPolygon(this.editingEntity, this.viewer);
        }
        
        // Update green roof overlay if it exists
        if (typeof updateGreenRoofVisualization === 'function') {
            updateGreenRoofVisualization(this.editingEntity);
        }
        
        if (window.showPolygonInfo) {
            try { window.showPolygonInfo(this.editingEntity); } catch (e) {}
        }
    }

    addVertexBetween(index1, index2) {
        if (!this.editMode || !this.vertexEntities.length) return;
        const pos1 = this.vertexEntities[index1].position;
        const pos2 = this.vertexEntities[index2].position;
        const cart1 = pos1.getValue ? pos1.getValue(Cesium.JulianDate.now()) : pos1;
        const cart2 = pos2.getValue ? pos2.getValue(Cesium.JulianDate.now()) : pos2;
        const midpoint = Cesium.Cartesian3.lerp(cart1, cart2, 0.5, new Cesium.Cartesian3());
        
        this.vertexEntities.splice(index2, 0, this.viewer.entities.add({
            position: midpoint,
            point: {
                pixelSize: 20,
                color: Cesium.Color.RED,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 3,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            properties: { isVertex: true, vertexIndex: index2 }
        }));
        
        this.vertexEntities.forEach((v, i) => v.properties.vertexIndex = i);
        this.updatePolygonFromVertices();
        console.log(`+ Added vertex between ${index1} and ${index2}`);
    }

    deleteVertex(vertexEntity) {
        if (!this.editMode || this.vertexEntities.length <= 3) {
            return console.log("⚠ Cannot delete - minimum 3 vertices required");
        }
        if (this.editingEntity && this.isProtectedEntity(this.editingEntity)) {
            return console.log("Protected polygon - cannot delete vertex");
        }
        const index = this.vertexEntities.indexOf(vertexEntity);
        if (index === -1) return;
        this.viewer.entities.remove(vertexEntity);
        this.vertexEntities.splice(index, 1);
        this.vertexEntities.forEach((v, i) => v.properties.vertexIndex = i);
        this.updatePolygonFromVertices();
        console.log(`✗ Deleted vertex ${index}`);
    }

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

    // === MODEL EDITING ===

    startEditingModel(model) {
        // Only allow editing when in edit mode
        if (typeof drawingMode !== 'undefined' && drawingMode !== "edit") {
            return;
        }
        if (this.editMode) this.stopEditing();
        
        this.editMode = true;
        this.editingModel = model;
        this._emitEditModeChanged();
        
        // Highlight model with yellow
        model._originalColor = model.color ? Cesium.Color.clone(model.color) : null;
        model._originalSilhouette = model.silhouetteColor ? Cesium.Color.clone(model.silhouetteColor) : null;
        model._originalSilhouetteSize = model.silhouetteSize || 0;
        
        model.color = Cesium.Color.YELLOW.withAlpha(0.6);
        model.silhouetteColor = Cesium.Color.YELLOW;
        model.silhouetteSize = 3.0;
        
        console.log("🎯 MODEL EDIT MODE");
        console.log("  • Drag to move");
        console.log("  • Arrow Left/Right to rotate (±3°)");
        console.log("  • Arrow Up/Down to scale (±0.1)");
        console.log("  • R key to rotate 90°");
        console.log("  • Right-click or ESC to finish");
    }

    rotateModel(degrees) {
        if (!this.editingModel) return;
        updateModelRotation(this.editingModel, this.editingModel.modelRotation + degrees);
        console.log(`↻ Model rotated ${degrees > 0 ? '+' : ''}${degrees}°`);
    }

    scaleModel(newScale) {
        if (!this.editingModel) return;
        updateModelScale(this.editingModel, newScale);
        console.log(`↔ Model scaled to ${newScale.toFixed(2)}`);
    }

    // === UNIFIED STOP EDITING ===

    stopEditing(skipAutoSave = false) {
        if (!this.editMode) return;
        this.editMode = false;
        this._emitEditModeChanged();
        
        // Clean up polygon editing
        if (this.editingEntity) {
            // Clean up vertex markers
            this.vertexEntities.forEach(v => this.viewer.entities.remove(v));
            this.vertexEntities = [];
            
            // Auto-save polygon changes to database (unless explicitly skipped, e.g., during deletion)
            const entityToSave = this.editingEntity;
            if (!skipAutoSave && entityToSave.polygon && typeof polygonAPI !== 'undefined' && entityToSave.polygonId) {
                polygonAPI.savePolygon(entityToSave)
                    .then(() => console.log('✓ Polygon changes saved to database'))
                    .catch(err => console.error('Failed to save polygon changes:', err));
            }
            
            this.editingEntity = null;
        }
        
        // Clean up model editing
        if (this.editingModel) {
            // Restore original appearance
            if (this.editingModel._originalColor !== null) {
                this.editingModel.color = this.editingModel._originalColor;
            } else {
                this.editingModel.color = undefined;
            }
            
            if (this.editingModel._originalSilhouette !== null) {
                this.editingModel.silhouetteColor = this.editingModel._originalSilhouette;
            } else {
                this.editingModel.silhouetteColor = undefined;
            }
            
            this.editingModel.silhouetteSize = this.editingModel._originalSilhouetteSize;
            
            console.log(`✓ Model editing finished`);
            this.editingModel = null;
        }
        
        this.draggedVertex = null;
        this.moveStart = null;
        this.viewer.scene.screenSpaceCameraController.enableRotate = true;
        this.viewer.scene.screenSpaceCameraController.enableTranslate = true;
        console.log("EDIT MODE OFF");
        if (window.clearPolygonInfo) window.clearPolygonInfo();
    }

    // === KEYBOARD CONTROLS ===

    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            // Prevent keyboard shortcuts when typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }
            
            if (!this.editMode) return;

            // MODEL CONTROLS
            if (this.editingModel) {
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const current = this.editingModel.modelScale || 1.0;
                    this.scaleModel(Math.max(0.1, current + 0.1));
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const current = this.editingModel.modelScale || 1.0;
                    this.scaleModel(Math.max(0.1, current - 0.1));
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.rotateModel(-3);
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.rotateModel(3);
                } else if (e.key === 'r' || e.key === 'R') {
                    e.preventDefault();
                    this.rotateModel(90);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.stopEditing();
                }
                return;
            }
            
            // POLYGON CONTROLS
            if (this.editingEntity) {
                const isProtected = this.isProtectedEntity(this.editingEntity);
                const h = this.editingEntity.polygon.extrudedHeight || 0;
                
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (isProtected) return console.log("Protected polygon - cannot change height");
                    this.editingEntity.polygon.extrudedHeight = h + 5;
                    console.log("Height:", h + 5);
                    // Update green roof overlay if it exists
                    if (typeof updateGreenRoofVisualization === 'function') {
                        updateGreenRoofVisualization(this.editingEntity);
                    }
                    // Update goals display
                    if (typeof window.updateGoalsDisplay === 'function') {
                        window.updateGoalsDisplay();
                    }
                    if (window.showPolygonInfo) window.showPolygonInfo(this.editingEntity);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (isProtected) return console.log("Protected polygon - cannot change height");
                    this.editingEntity.polygon.extrudedHeight = Math.max(0, h - 5);
                    console.log("Height:", Math.max(0, h - 5));
                    // Update green roof overlay if it exists
                    if (typeof updateGreenRoofVisualization === 'function') {
                        updateGreenRoofVisualization(this.editingEntity);
                    }
                    // Update goals display
                    if (typeof window.updateGoalsDisplay === 'function') {
                        window.updateGoalsDisplay();
                    }
                    if (window.showPolygonInfo) window.showPolygonInfo(this.editingEntity);
                } else if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    if (isProtected) return console.log("Protected polygon - cannot delete");
                    
                    if (this.hoveredVertex) {
                        this.deleteVertex(this.hoveredVertex);
                    } else if (this.editingEntity) {
                        const ok = window.confirm ? window.confirm('Delete the selected polygon?') : true;
                        if (!ok) return;
                        
                        const entityToRemove = this.editingEntity;
                        
                        // Delete from database if it has an ID
                        if (entityToRemove.polygonId && typeof polygonAPI !== 'undefined') {
                            polygonAPI.deletePolygon(entityToRemove)
                                .then(() => console.log('✓ Polygon deleted from database'))
                                .catch(err => console.error('Failed to delete polygon from database:', err));
                        }
                        
                        this.stopEditing(true); // Pass true to skip auto-save
                        
                        try {
                            // Remove green roof overlay if it exists
                            if (entityToRemove._greenRoofOverlay && this.viewer.entities) {
                                this.viewer.entities.remove(entityToRemove._greenRoofOverlay);
                            }
                            
                            this.viewer.entities.remove(entityToRemove);
                            
                            // Remove from bounds tracking
                            if (typeof boundsChecker !== 'undefined') {
                                boundsChecker.removeEntityFromTracking(entityToRemove);
                            }
                            
                            const sid = entityToRemove.properties?.serverId;
                            if (sid != null && window.serverPolygonEntities) {
                                window.serverPolygonEntities.delete(sid);
                            }
                            // Update occupation stats after deletion
                            if (typeof window.updateOccupationStats === 'function') {
                                setTimeout(() => window.updateOccupationStats(), 100);
                            }
                        } catch (e) {
                            console.warn('Error removing polygon:', e);
                        }
                        if (window.clearPolygonInfo) window.clearPolygonInfo();
                    }
                } else if (e.key === 'r' || e.key === 'R') {
                    e.preventDefault();
                    this.rotatePolygon(90);
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.rotatePolygon(-3);
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.rotatePolygon(3);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.stopEditing();
                }
            }
        });
    }

    // === MOUSE HANDLERS ===

    handleLeftDown(event) {
        // CRITICAL: Only handle edit mode actions if in edit mode
        if (!this.editMode) return;
        
        if (this.editingEntity && this.isProtectedEntity(this.editingEntity)) {
            return console.log("Protected polygon - editing not allowed");
        }

        // Model dragging
        if (this.editingModel) {
            const ray = this.viewer.camera.getPickRay(event.position);
            this.moveStart = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            if (Cesium.defined(this.moveStart)) {
                this.viewer.scene.screenSpaceCameraController.enableRotate = false;
                this.viewer.scene.screenSpaceCameraController.enableTranslate = false;
                console.log("✋ Dragging model...");
            }
            return;
        }
        
        // Polygon vertex dragging
        const picked = this.viewer.scene.pick(event.position);
        if (Cesium.defined(picked) && picked.id?.properties?.isVertex) {
            this.draggedVertex = picked.id;
            this.viewer.scene.screenSpaceCameraController.enableRotate = false;
            this.viewer.scene.screenSpaceCameraController.enableTranslate = false;
            console.log("✋ Dragging vertex...");
        } else {
            const ray = this.viewer.camera.getPickRay(event.position);
            this.moveStart = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            if (Cesium.defined(this.moveStart)) {
                this.viewer.scene.screenSpaceCameraController.enableRotate = false;
                this.viewer.scene.screenSpaceCameraController.enableTranslate = false;
            }
        }
    }

    handleLeftUp(event) {
        if (this.draggedVertex || this.moveStart) {
            if (this.draggedVertex) console.log("✓ Stopped dragging vertex");
            if (this.moveStart && this.editingModel) console.log("✓ Stopped dragging model");
            this.draggedVertex = null;
            this.moveStart = null;
            this.viewer.scene.screenSpaceCameraController.enableRotate = true;
            this.viewer.scene.screenSpaceCameraController.enableTranslate = true;
            
            // Update occupation stats after editing/moving polygon
            if (typeof window.updateOccupationStats === 'function') {
                setTimeout(() => window.updateOccupationStats(), 100);
            }
        }
    }

    handleMouseMove(event) {
        // Model movement
        if (this.editingModel && this.moveStart) {
            const ray = this.viewer.camera.getPickRay(event.endPosition);
            const currentPos = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            if (Cesium.defined(currentPos)) {
                const carto = Cesium.Cartographic.fromCartesian(currentPos);
                const lon = Cesium.Math.toDegrees(carto.longitude);
                const lat = Cesium.Math.toDegrees(carto.latitude);
                const height = this.editingModel.modelHeight || 0;
                
                updateModelPosition(this.editingModel, { lon, lat }, height);
                this.moveStart = currentPos;
            }
            return;
        }
        
        // Polygon vertex dragging
        if (this.draggedVertex) {
            const ray = this.viewer.camera.getPickRay(event.endPosition);
            const newPos = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            if (Cesium.defined(newPos)) {
                this.draggedVertex.position = newPos;
                this.updatePolygonFromVertices();
            }
        } else if (this.editMode && this.moveStart && !this.editingModel) {
            if (this.editingEntity && this.isProtectedEntity(this.editingEntity)) return;
            const ray = this.viewer.camera.getPickRay(event.endPosition);
            const currentPos = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            if (Cesium.defined(currentPos)) {
                const offset = Cesium.Cartesian3.subtract(currentPos, this.moveStart, new Cesium.Cartesian3());
                this.vertexEntities.forEach(v => {
                    const oldPos = v.position.getValue ? v.position.getValue(Cesium.JulianDate.now()) : v.position;
                    v.position = Cesium.Cartesian3.add(oldPos, offset, new Cesium.Cartesian3());
                });
                this.updatePolygonFromVertices();
                this.moveStart = currentPos;
            }
        } else if (this.editMode && !this.editingModel) {
            const picked = this.viewer.scene.pick(event.endPosition);
            if (this.editingEntity && this.isProtectedEntity(this.editingEntity)) {
                this.hoveredVertex = null;
            } else {
                this.hoveredVertex = (Cesium.defined(picked) && picked.id?.properties?.isVertex) ? picked.id : null;
            }
        }
    }
    
    handleDoubleClick(event) {
        // PRIORITY 1: If already in edit mode, handle vertex addition
        if (this.editMode && this.editingEntity) {
            if (this.isProtectedEntity(this.editingEntity)) return false;
            
            const picked = this.viewer.scene.pick(event.position);
            
            // If clicked on a vertex, add new vertex after it
            if (Cesium.defined(picked) && picked.id?.properties?.isVertex) {
                const idx = picked.id.properties.vertexIndex;
                this.addVertexBetween(idx, (idx + 1) % this.vertexEntities.length);
                return true;
            }
            
            // Resolve green roof overlay to parent entity
            let targetEntity = picked.id;
            if (picked.id?.properties?.isGreenRoofOverlay && picked.id._parentEntity) {
                targetEntity = picked.id._parentEntity;
            }
            
            // If clicked on the polygon edge, find closest edge
            if (Cesium.defined(picked) && targetEntity === this.editingEntity) {
                const ray = this.viewer.camera.getPickRay(event.position);
                const clickedPos = this.viewer.scene.globe.pick(ray, this.viewer.scene);
                
                if (Cesium.defined(clickedPos)) {
                    let closestEdge = { index: 0, distance: Infinity };
                    
                    for (let i = 0; i < this.vertexEntities.length; i++) {
                        const nextIdx = (i + 1) % this.vertexEntities.length;
                        const v1 = this.vertexEntities[i].position;
                        const v2 = this.vertexEntities[nextIdx].position;
                        
                        const pos1 = v1.getValue ? v1.getValue(Cesium.JulianDate.now()) : v1;
                        const pos2 = v2.getValue ? v2.getValue(Cesium.JulianDate.now()) : v2;
                        
                        const edge = Cesium.Cartesian3.subtract(pos2, pos1, new Cesium.Cartesian3());
                        const edgeLen = Cesium.Cartesian3.magnitude(edge);
                        const toClick = Cesium.Cartesian3.subtract(clickedPos, pos1, new Cesium.Cartesian3());
                        
                        let t = Cesium.Cartesian3.dot(toClick, edge) / (edgeLen * edgeLen);
                        t = Math.max(0, Math.min(1, t));
                        
                        const closestPoint = Cesium.Cartesian3.add(
                            pos1,
                            Cesium.Cartesian3.multiplyByScalar(edge, t, new Cesium.Cartesian3()),
                            new Cesium.Cartesian3()
                        );
                        
                        const distance = Cesium.Cartesian3.distance(clickedPos, closestPoint);
                        
                        if (distance < closestEdge.distance) {
                            closestEdge = { index: i, distance };
                        }
                    }
                    
                    if (closestEdge.distance < 50) {
                        this.addVertexBetween(closestEdge.index, (closestEdge.index + 1) % this.vertexEntities.length);
                        return true;
                    }
                }
            }
            return false;
        }
        
        // PRIORITY 2: Not in edit mode, start editing
        const picked = this.viewer.scene.pick(event.position);
        
        // Check for model primitive
        if (Cesium.defined(picked) && Cesium.defined(picked.primitive)) {
            if (picked.primitive instanceof Cesium.Model || 
                (picked.primitive.modelMatrix && !picked.id)) {
                this.startEditingModel(picked.primitive);
                return true;
            }
        }
        
        // Check for polygon entity
        if (Cesium.defined(picked) && picked.id?.polygon && !picked.id.properties?.isVertex) {
            // If clicked on green roof overlay, use parent entity instead
            let targetEntity = picked.id;
            if (picked.id.properties?.isGreenRoofOverlay && picked.id._parentEntity) {
                targetEntity = picked.id._parentEntity;
            }
            this.startEditingPolygon(targetEntity);
            return true;
        }
        
        return false;
    }

    handleRightClick(event) {
        if (this.editMode) {
            this.stopEditing();
            return true;
        }
        return false;
    }

    // === UTILITIES ===

    editingWhat() {
        if (this.editingModel) return "model";
        if (this.editingEntity) return "polygon";
        return null;
    }

    _emitEditModeChanged() {
        const detail = {
            editMode: !!this.editMode,
            what: this.editingWhat(),
            object: this.editingModel || this.editingEntity || null,
            timestamp: Date.now()
        };

        // Add polygon-specific info
        if (this.editingEntity?.polygon) {
            detail.polygonType = getEntityType(this.editingEntity);
            detail.setPolygonType = (newType) => {
                setEntityType(this.editingEntity, getTypeById(newType));
                if (window.showPolygonInfo) {
                    try { window.showPolygonInfo(this.editingEntity); } catch (e) {}
                }
            };
        }

        // Add model-specific info
        if (this.editingModel) {
            detail.modelType = this.editingModel.buildType || "DEFAULT";
            detail.setModelType = (newType) => {
                updateModelType(this.editingModel, getTypeById(newType));
            };
        }

        try {
            document.dispatchEvent(new CustomEvent('object-editor-editmode-changed', { detail }));
        } catch (e) {
            console.warn("Failed to dispatch editmode event:", e);
        }

        if (typeof this.onEditModeChanged === 'function') {
            try { this.onEditModeChanged(detail); } catch (e) { console.warn("onEditModeChanged error:", e); }
        }
    }
}

if (typeof global !== "undefined") {
  global.ObjectEditor = ObjectEditor;
}
if (typeof window !== "undefined") {
  window.ObjectEditor = ObjectEditor;
}