class ObjectEditor {
    constructor(viewer) {
        this.viewer = viewer;
        this.editMode = false;
        this.editingEntity = null;
        this.editingModel = null;
        this.modelRotation = 0; // Store rotation separately
        this.modelScale = null; // Store scale separately
        this.originalModelColor = null; // Store original model color
        this.originalModelSilhouette = null; // Store original silhouette
        this.originalModelSilhouetteSize = 0; // Store original silhouette size
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
            if (entity.properties && entity.properties.isSpoordok) return true;
            if (typeof entity.name === 'string' && entity.name === 'Spoordok') return true;
        } catch (e) {
            // ignore
        }
        return false;
    }

    closestPointOnSegment(segmentStart, segmentEnd, point) {
        const v = Cesium.Cartesian3.subtract(segmentEnd, segmentStart, new Cesium.Cartesian3());
        const w = Cesium.Cartesian3.subtract(point, segmentStart, new Cesium.Cartesian3());
        const segLenSq = Cesium.Cartesian3.dot(v, v);
        if (segLenSq === 0) {
            return Cesium.Cartesian3.clone(segmentStart);
        }
        const dot = Cesium.Cartesian3.dot(w, v);
        const t = Math.max(0, Math.min(1, dot / segLenSq));
        const proj = Cesium.Cartesian3.add(
            segmentStart,
            Cesium.Cartesian3.multiplyByScalar(v, t, new Cesium.Cartesian3()),
            new Cesium.Cartesian3()
        );
        return proj;
    }

    addVertexAtPosition(position, screenPosition) {
        if (!this.editMode || !this.vertexEntities.length || this.editingModel) return;

        const scene = this.viewer.scene;
        const positions = this.vertexEntities.map(v => 
            v.position.getValue ? v.position.getValue(Cesium.JulianDate.now()) : v.position
        );

        const positionsForEdges = [...positions, positions[0]];

        let closestEdgeIndex = -1;
        let minScreenDistSq = Number.MAX_VALUE;
        let closestProjection = null;

        const PIXEL_TOLERANCE = 12;
        const pixelTolSq = PIXEL_TOLERANCE * PIXEL_TOLERANCE;

        for (let i = 0; i < positionsForEdges.length - 1; i++) {
            const edgeStart = positionsForEdges[i];
            const edgeEnd = positionsForEdges[i + 1];

            const projection = this.closestPointOnSegment(edgeStart, edgeEnd, position);

            try {
                const projScreen = scene.cartesianToCanvasCoordinates(projection);
                if (!projScreen) continue;
                
                const dx = projScreen.x - screenPosition.x;
                const dy = projScreen.y - screenPosition.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < minScreenDistSq) {
                    minScreenDistSq = distSq;
                    closestEdgeIndex = i;
                    closestProjection = projection;
                }
            } catch (e) {
                continue;
            }
        }

        if (minScreenDistSq === Number.MAX_VALUE || minScreenDistSq > pixelTolSq) {
            console.log("Click not close enough to any polygon edge (screen tolerance).");
            return;
        }

        const insertIndex = (closestEdgeIndex + 1) % this.vertexEntities.length;
        const newVertexPos = closestProjection || position;

        this.vertexEntities.splice(insertIndex, 0, this.viewer.entities.add({
            position: newVertexPos,
            point: {
                pixelSize: 20,
                color: Cesium.Color.RED,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 3,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            properties: { isVertex: true, vertexIndex: insertIndex }
        }));

        this.vertexEntities.forEach((v, i) => v.properties.vertexIndex = i);
        this.updatePolygonFromVertices();
        console.log(`Added vertex at closest edge (edge ${closestEdgeIndex})`);
    }

    // Start editing a model
    startEditingModel(model) {
        if (typeof drawingMode !== 'undefined' && drawingMode !== "edit") return;
        if (this.editMode) this.stopEditingPolygon();
        
        this.editMode = true;
        this.editingModel = model;
        this._emitEditModeChanged();
        
        // Extract and store current transformation properties
        const position = new Cesium.Cartesian3();
        Cesium.Matrix4.getTranslation(model.modelMatrix, position);
        
        this.modelScale = new Cesium.Cartesian3();
        Cesium.Matrix4.getScale(model.modelMatrix, this.modelScale);
        
        // Try to extract current rotation or start at 0
        this.modelRotation = model.modelRotation || 0;
        
        this.moveStart = null;
        
        // Store original model appearance
        this.originalModelColor = model.color ? Cesium.Color.clone(model.color) : null;
        this.originalModelSilhouette = model.silhouetteColor ? Cesium.Color.clone(model.silhouetteColor) : null;
        this.originalModelSilhouetteSize = model.silhouetteSize || 0;
        
        // Apply yellow transparent color for editing
        model.color = Cesium.Color.YELLOW.withAlpha(0.6);
        model.silhouetteColor = Cesium.Color.YELLOW;
        model.silhouetteSize = 3.0;
        
        console.log("🎯 MODEL EDIT MODE");
        console.log("  • Drag to move");
        console.log("  • Arrow Left/Right to rotate (±15°)");
        console.log("  • R key to rotate 90°");
        console.log("  • Right-click or ESC to finish");
    }

    stopEditingPolygon() {
        if (!this.editMode) return;
        this.editMode = false;
        this._emitEditModeChanged();
        
        // Clean up polygon editing
        if (this.editingEntity && this.originalMaterial) {
            this.editingEntity.polygon.material = this.originalMaterial;
        }
        this.vertexEntities.forEach(v => this.viewer.entities.remove(v));
        this.vertexEntities = [];
        this.editingEntity = null;
        this.originalMaterial = null;
        
        // Save model rotation and restore appearance if editing model
        if (this.editingModel) {
            this.editingModel.modelRotation = this.modelRotation;
            
            // Restore original model appearance
            if (this.originalModelColor !== null) {
                this.editingModel.color = this.originalModelColor;
            } else {
                this.editingModel.color = undefined;
            }
            
            if (this.originalModelSilhouette !== null) {
                this.editingModel.silhouetteColor = this.originalModelSilhouette;
            } else {
                this.editingModel.silhouetteColor = undefined;
            }
            
            this.editingModel.silhouetteSize = this.originalModelSilhouetteSize;
            
            console.log(`✓ Model editing finished (rotation: ${this.modelRotation}°)`);
        }
        
        // Clean up model editing
        this.editingModel = null;
        this.modelRotation = 0;
        this.modelScale = null;
        this.originalModelColor = null;
        this.originalModelSilhouette = null;
        this.originalModelSilhouetteSize = 0;
        
        this.draggedVertex = null;
        this.moveStart = null;
        this.viewer.scene.screenSpaceCameraController.enableRotate = true;
        this.viewer.scene.screenSpaceCameraController.enableTranslate = true;
        console.log("EDIT MODE OFF");
        if (window.clearPolygonInfo) window.clearPolygonInfo();
    }

    distanceToSegment(point, segmentStart, segmentEnd) {
        const segmentLengthSquared = Cesium.Cartesian3.distanceSquared(segmentStart, segmentEnd);
        
        if (segmentLengthSquared === 0) {
            return Cesium.Cartesian3.distance(point, segmentStart);
        }
        
        const v = Cesium.Cartesian3.subtract(segmentEnd, segmentStart, new Cesium.Cartesian3());
        const w = Cesium.Cartesian3.subtract(point, segmentStart, new Cesium.Cartesian3());
        
        const dot = Cesium.Cartesian3.dot(w, v);
        const t = Math.max(0, Math.min(1, dot / segmentLengthSquared));
        
        const projection = Cesium.Cartesian3.add(
            segmentStart,
            Cesium.Cartesian3.multiplyByScalar(v, t, new Cesium.Cartesian3()),
            new Cesium.Cartesian3()
        );
        
        return Cesium.Cartesian3.distance(point, projection);
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

    startEditingPolygon(entity) {
        if (!entity.polygon) return console.log("No polygon found");
        if (typeof drawingMode !== 'undefined' && drawingMode !== "edit") return;
        if (this.editMode) this.stopEditingPolygon();
        // If this polygon is marked as protected (e.g., the Spoordok area),
        // do NOT create vertices, do NOT apply yellow edit material,
        // and only show the polygon info container.
        if (this.isProtectedEntity(entity)) {
            this.editMode = true;
            this.editingEntity = entity;
            this._emitEditModeChanged();
            console.log("Protected polygon selected — showing info only (no edit).");
            if (window.showPolygonInfo) window.showPolygonInfo(this.editingEntity);
            return;
        }

        this.editMode = true;
        this.editingEntity = entity;
        this._emitEditModeChanged();
        this.originalMaterial = entity.polygon.material;
        entity.polygon.material = Cesium.Color.YELLOW.withAlpha(0.5);

        const positions = this.getPositions(entity.polygon.hierarchy);
        if (!positions.length) {
            console.error("No positions found!");
            return this.stopEditingPolygon();
        }

        positions.forEach((position, index) => {
            this.vertexEntities.push(this.viewer.entities.add({
                position: position,
                point: {
                    pixelSize: 20,
                    color: Cesium.Color.RED,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 3,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                },
                properties: { isVertex: true, vertexIndex: index }
            }));
        });
        console.log("EDIT MODE ON");
        if (window.showPolygonInfo) window.showPolygonInfo(this.editingEntity);
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

    // Rotate model
    rotateModel(degrees) {
        if (!this.editingModel) return;
        
        // Update stored rotation
        this.modelRotation += degrees;
        
        // Normalize to 0-360 range for display
        const displayRotation = ((this.modelRotation % 360) + 360) % 360;
        
        // Extract current position
        const position = new Cesium.Cartesian3();
        Cesium.Matrix4.getTranslation(this.editingModel.modelMatrix, position);
        
        // Create orientation from heading (rotation around up axis)
        const heading = Cesium.Math.toRadians(this.modelRotation);
        const hpr = new Cesium.HeadingPitchRoll(heading, 0, 0);
        const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
        
        // Update model matrix with new rotation
        this.editingModel.modelMatrix = Cesium.Matrix4.fromTranslationQuaternionRotationScale(
            position,
            orientation,
            this.modelScale
        );
        
        console.log(`↻ Model rotated to ${displayRotation.toFixed(0)}° (${degrees > 0 ? '+' : ''}${degrees}°)`);
    }

    updatePolygonFromVertices() {
        if (!this.editingEntity || !this.vertexEntities.length) return;
        const positions = this.vertexEntities.map(v => 
            v.position.getValue ? v.position.getValue(Cesium.JulianDate.now()) : v.position
        );
        this.editingEntity.polygon.hierarchy = new Cesium.PolygonHierarchy(positions);
        // If a UI info panel exists, refresh it so coordinates stay in sync while dragging/moving
        if (window.showPolygonInfo) {
            try { window.showPolygonInfo(this.editingEntity); } catch (e) { /* ignore UI errors */ }
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
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
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

    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (this.editMode) {
                // Handle model rotation
                if (this.editingModel) {
                    if (e.key === 'ArrowLeft') {
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
                        this.stopEditingPolygon();
                    }
                    return;
                }
                
                // Handle polygon editing
                if (this.editingEntity) {
                    const h = this.editingEntity.polygon.extrudedHeight || 0;
                    // Scaling height
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.editingEntity.polygon.extrudedHeight = h + 5;
                    console.log("Height:", h + 5);
                    if (window.showPolygonInfo) window.showPolygonInfo(this.editingEntity);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.editingEntity.polygon.extrudedHeight = Math.max(0, h - 5);
                    console.log("Height:", Math.max(0, h - 5));
                    if (window.showPolygonInfo) window.showPolygonInfo(this.editingEntity);

                    // Deleting vertex
                } else if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    // If hovering a vertex, delete the vertex. Otherwise offer to delete the whole polygon.
                    // Protect certain polygons from deletion/modification
                    if (this.editingEntity && this.isProtectedEntity(this.editingEntity)) {
                        console.log("Protected polygon - cannot delete or modify");
                        return;
                    }
                    if (this.hoveredVertex) {
                        this.deleteVertex(this.hoveredVertex);
                    } else if (this.editingEntity) {
                        // Confirm destructive action with the user
                        try {
                            const ok = window.confirm ? window.confirm('Delete the selected polygon?') : true;
                            if (!ok) return;
                        } catch (ignore) {
                            // In some contexts confirm might not be available - proceed without it
                        }

                        // Capture reference to entity before stopping edit (stopEditingPolygon will clear editingEntity)
                        const entityToRemove = this.editingEntity;
                        // Stop editing which clears vertex markers and UI
                        this.stopEditingPolygon();

                        try {
                            // Remove from viewer
                            this.viewer.entities.remove(entityToRemove);
                        } catch (e) {
                            console.warn('Error removing polygon entity:', e);
                        }

                        try {
                            // If it was a server polygon, remove mapping so it won't be re-used
                            const sid = entityToRemove.properties && entityToRemove.properties.serverId;
                            if (sid != null && window.serverPolygonEntities) {
                                window.serverPolygonEntities.delete(sid);
                            }
                        } catch (e) {
                            // ignore
                        }
                        // Ensure UI is cleared
                        if (window.clearPolygonInfo) window.clearPolygonInfo();
                    }

                    // Rotation
                } else if (e.key === 'r' || e.key === 'R') {
                    e.preventDefault();
                    this.rotatePolygon(90);
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.rotatePolygon(-3);
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.rotatePolygon(3);

                    // Stop editing (note: can also use right click)
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.stopEditingPolygon();
                }
            }
        }});
    }

    handleLeftDown(event) {
        if (!this.editMode) return;
        // If editing a protected polygon, disallow dragging/move actions
        if (this.editingEntity && this.isProtectedEntity(this.editingEntity) && !this.editingModel) {
            console.log("Protected polygon - editing not allowed (left down)");
            return;
        }
        // Handle model dragging
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
        
        // Handle polygon vertex dragging
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
        }
    }

    handleMouseMove(event) {
        // Handle model movement
        if (this.editingModel && this.moveStart) {
            const ray = this.viewer.camera.getPickRay(event.endPosition);
            const currentPos = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            if (Cesium.defined(currentPos)) {
                // Create orientation with current rotation
                const heading = Cesium.Math.toRadians(this.modelRotation);
                const hpr = new Cesium.HeadingPitchRoll(heading, 0, 0);
                const orientation = Cesium.Transforms.headingPitchRollQuaternion(currentPos, hpr);
                
                // Update model matrix with new position (keeping rotation and scale)
                this.editingModel.modelMatrix = Cesium.Matrix4.fromTranslationQuaternionRotationScale(
                    currentPos,
                    orientation,
                    this.modelScale
                );
                
                this.moveStart = currentPos;
            }
            return;
        }
        
        // Handle polygon vertex dragging
        if (this.draggedVertex) {
            const ray = this.viewer.camera.getPickRay(event.endPosition);
            const newPos = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            if (Cesium.defined(newPos)) {
                this.draggedVertex.position = newPos;
                this.updatePolygonFromVertices();
            }
        } else if (this.editMode && this.moveStart && !this.editingModel) {
            // Prevent moving the protected polygon
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
            // If editing a protected polygon, don't set hovered vertices
            if (this.editingEntity && this.isProtectedEntity(this.editingEntity)) {
                this.hoveredVertex = null;
            } else {
                this.hoveredVertex = (Cesium.defined(picked) && picked.id?.properties?.isVertex) ? picked.id : null;
            }
        }
    }

    handleCtrlClick(event) {
        if (!this.editMode || this.editingModel) return false;
        if (this.editingEntity && this.isProtectedEntity(this.editingEntity)) return false;
        const picked = this.viewer.scene.pick(event.position);
        if (Cesium.defined(picked) && picked.id?.properties?.isVertex) {
            const idx = picked.id.properties.vertexIndex;
            this.addVertexBetween(idx, (idx + 1) % this.vertexEntities.length);
            return true;
        }
        return false;
    }

    handleDoubleClick(event) {
        // Check if clicking on a model primitive
        const picked = this.viewer.scene.pick(event.position);
        
        // If we picked a primitive (3D model), start editing it
        if (Cesium.defined(picked) && Cesium.defined(picked.primitive)) {
            // Check if this is a model primitive (not a polygon or vertex)
            if (picked.primitive instanceof Cesium.Model || 
                (picked.primitive.modelMatrix && !picked.id)) {
                this.startEditingModel(picked.primitive);
                return;
            }
        }
        
        // If in edit mode and editing polygon, try to add a vertex on an edge
        if (this.editMode && this.editingEntity && !this.editingModel) {
            const ray = this.viewer.camera.getPickRay(event.position);
            if (!ray) return;
            
            const intersection = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            if (Cesium.defined(intersection)) {
                this.addVertexAtPosition(intersection, event.position);
                return;
            }
        }
        
        // Otherwise, check if clicking on a polygon entity to start editing
        if (Cesium.defined(picked) && picked.id?.polygon && !picked.id.properties?.isVertex) {
            this.startEditingPolygon(picked.id);
        }
    }

    handleRightClick(event) {
        if (this.editMode) {
            this.stopEditingPolygon();
            return true;
        }
        return false;
    }


    editingWhat() {        
        if (this.editingModel) return "model";
        if (this.editingEntity) return "polygon";
        return null;
    }

    _emitEditModeChanged() {
    const detail = {
        editMode: !!this.editMode,
        what: this.editingWhat(),                  // "model", "polygon", or null
        object: this.editingModel || this.editingEntity || null,
        timestamp: Date.now()
    };

    // Dispatch DOM event
    try {
        document.dispatchEvent(new CustomEvent('object-editor-editmode-changed', { detail }));
    } catch (e) {
        // ignore if dispatching fails for some reason
        console.warn("Failed to dispatch editmode event:", e);
    }

    // Call optional JS callback
    if (typeof this.onEditModeChanged === 'function') {
        try { this.onEditModeChanged(detail); } catch (e) { console.warn("onEditModeChanged error:", e); }
    }
}
}