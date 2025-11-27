// polygonEditor.js - Polygon editing functionality

class PolygonEditor {
    constructor(viewer) {
        this.viewer = viewer;
        this.editMode = false;
        this.moveMode = false;
        this.editingEntity = null;
        this.vertexEntities = [];
        this.originalPolygonMaterial = null;
        this.draggedVertex = null;
        this.hoveredVertex = null;
        this.movingPolygon = null;
        this.moveStartPosition = null;
        this.polygonOriginalPositions = null;
        
        this.setupKeyboardControls();
    }

    startEditingPolygon(entity) {
        if (!entity.polygon) {
            console.log("No polygon found on entity");
            return;
        }
        
        if (this.editMode) {
            this.stopEditingPolygon();
        }
        
        this.editMode = true;
        this.editingEntity = entity;
        
        this.originalPolygonMaterial = entity.polygon.material;
        entity.polygon.material = Cesium.Color.YELLOW.withAlpha(0.5);
        
        let hierarchy = entity.polygon.hierarchy;
        
        if (hierarchy instanceof Cesium.CallbackProperty) {
            hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
        }
        
        if (typeof hierarchy.getValue === 'function') {
            hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
        }
        
        let positions = [];
        
        if (hierarchy instanceof Cesium.PolygonHierarchy) {
            positions = hierarchy.positions;
        } else if (hierarchy.positions) {
            positions = hierarchy.positions;
        } else if (Array.isArray(hierarchy)) {
            positions = hierarchy;
        }
        
        if (positions.length === 0) {
            console.error("No positions found!");
            this.stopEditingPolygon();
            return;
        }
        
        positions.forEach((position, index) => {
            const vertexEntity = this.viewer.entities.add({
                position: position,
                point: {
                    pixelSize: 20,
                    color: Cesium.Color.RED,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 3,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                },
                properties: {
                    isVertex: true,
                    vertexIndex: index,
                }
            });
            this.vertexEntities.push(vertexEntity);
        });
        
        console.log("EDIT MODE ON - Drag red vertices to reshape. CTRL+Click vertex to add new vertex after it. Hover vertex and press DELETE to remove it. Use arrow keys UP/DOWN to change height. Right-click to finish.");
    }

    stopEditingPolygon() {
        if (!this.editMode) return;
        
        this.editMode = false;
        
        if (this.editingEntity && this.originalPolygonMaterial) {
            this.editingEntity.polygon.material = this.originalPolygonMaterial;
        }
        
        this.vertexEntities.forEach(vertex => {
            this.viewer.entities.remove(vertex);
        });
        this.vertexEntities = [];
        
        this.editingEntity = null;
        this.originalPolygonMaterial = null;
        this.draggedVertex = null;
        
        console.log("EDIT MODE OFF");
    }

    startMovingPolygon(entity) {
        if (!entity.polygon) {
            console.log("No polygon found on entity");
            return;
        }
        
        this.moveMode = true;
        this.movingPolygon = entity;
        
        this.originalPolygonMaterial = entity.polygon.material;
        entity.polygon.material = Cesium.Color.CYAN.withAlpha(0.5);
        
        let hierarchy = entity.polygon.hierarchy;
        
        if (hierarchy instanceof Cesium.CallbackProperty) {
            hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
        }
        
        if (typeof hierarchy.getValue === 'function') {
            hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
        }
        
        let positions = [];
        
        if (hierarchy instanceof Cesium.PolygonHierarchy) {
            positions = hierarchy.positions;
        } else if (hierarchy.positions) {
            positions = hierarchy.positions;
        } else if (Array.isArray(hierarchy)) {
            positions = hierarchy;
        }
        
        this.polygonOriginalPositions = positions.slice();
        
        console.log("MOVE MODE ON - Drag to move polygon. Press R to rotate 90°, E to rotate -90°. Right-click to finish.");
    }

    stopMovingPolygon() {
        if (!this.moveMode) return;
        
        this.moveMode = false;
        
        if (this.movingPolygon && this.originalPolygonMaterial) {
            this.movingPolygon.polygon.material = this.originalPolygonMaterial;
        }
        
        this.movingPolygon = null;
        this.moveStartPosition = null;
        this.polygonOriginalPositions = null;
        this.originalPolygonMaterial = null;
        
        this.viewer.scene.screenSpaceCameraController.enableRotate = true;
        this.viewer.scene.screenSpaceCameraController.enableTranslate = true;
        
        console.log("MOVE MODE OFF");
    }

    rotatePolygon(entity, degrees) {
        if (!entity.polygon) return;
        
        let hierarchy = entity.polygon.hierarchy;
        
        if (hierarchy instanceof Cesium.CallbackProperty) {
            hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
        }
        
        if (typeof hierarchy.getValue === 'function') {
            hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
        }
        
        let positions = [];
        
        if (hierarchy instanceof Cesium.PolygonHierarchy) {
            positions = hierarchy.positions;
        } else if (hierarchy.positions) {
            positions = hierarchy.positions;
        } else if (Array.isArray(hierarchy)) {
            positions = hierarchy;
        }
        
        if (positions.length === 0) return;
        
        let centerX = 0, centerY = 0, centerZ = 0;
        positions.forEach(pos => {
            centerX += pos.x;
            centerY += pos.y;
            centerZ += pos.z;
        });
        centerX /= positions.length;
        centerY /= positions.length;
        centerZ /= positions.length;
        const center = new Cesium.Cartesian3(centerX, centerY, centerZ);
        
        const centerCartographic = Cesium.Cartographic.fromCartesian(center);
        const centerDegrees = Cesium.Cartesian3.fromRadians(
            centerCartographic.longitude,
            centerCartographic.latitude,
            centerCartographic.height
        );
        
        const angle = Cesium.Math.toRadians(degrees);
        const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);
        const rotation = Cesium.Matrix3.fromRotationZ(angle);
        const rotationMatrix4 = Cesium.Matrix4.fromRotationTranslation(rotation);
        
        const newPositions = positions.map(pos => {
            const localPos = Cesium.Matrix4.multiplyByPoint(
                Cesium.Matrix4.inverse(transform, new Cesium.Matrix4()),
                pos,
                new Cesium.Cartesian3()
            );
            
            const rotatedLocal = Cesium.Matrix3.multiplyByVector(
                rotation,
                localPos,
                new Cesium.Cartesian3()
            );
            
            const worldPos = Cesium.Matrix4.multiplyByPoint(
                transform,
                rotatedLocal,
                new Cesium.Cartesian3()
            );
            
            return worldPos;
        });
        
        entity.polygon.hierarchy = new Cesium.PolygonHierarchy(newPositions);
        console.log(`Rotated polygon ${degrees} degrees`);
    }

    updatePolygonPosition(offset) {
        if (!this.movingPolygon || !this.polygonOriginalPositions) return;
        
        const newPositions = this.polygonOriginalPositions.map(pos => {
            return Cesium.Cartesian3.add(pos, offset, new Cesium.Cartesian3());
        });
        
        this.movingPolygon.polygon.hierarchy = new Cesium.PolygonHierarchy(newPositions);
    }

    updatePolygonFromVertices() {
        if (!this.editingEntity || this.vertexEntities.length === 0) return;
        
        const newPositions = this.vertexEntities.map(v => {
            const pos = v.position;
            if (pos.getValue) {
                return pos.getValue(Cesium.JulianDate.now());
            }
            return pos;
        });
        this.editingEntity.polygon.hierarchy = new Cesium.PolygonHierarchy(newPositions);
    }

    addVertexBetween(index1, index2) {
        if (!this.editMode || this.vertexEntities.length === 0) return;
        
        const pos1 = this.vertexEntities[index1].position;
        const pos2 = this.vertexEntities[index2].position;
        
        const cart1 = pos1.getValue ? pos1.getValue(Cesium.JulianDate.now()) : pos1;
        const cart2 = pos2.getValue ? pos2.getValue(Cesium.JulianDate.now()) : pos2;
        
        const midpoint = Cesium.Cartesian3.lerp(cart1, cart2, 0.5, new Cesium.Cartesian3());
        
        const newVertexEntity = this.viewer.entities.add({
            position: midpoint,
            point: {
                pixelSize: 20,
                color: Cesium.Color.RED,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 3,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            properties: {
                isVertex: true,
                vertexIndex: index2,
            }
        });
        
        this.vertexEntities.splice(index2, 0, newVertexEntity);
        
        this.vertexEntities.forEach((vertex, idx) => {
            vertex.properties.vertexIndex = idx;
        });
        
        this.updatePolygonFromVertices();
        console.log(`Added vertex between ${index1} and ${index2}`);
    }

    deleteVertex(vertexEntity) {
        if (!this.editMode || this.vertexEntities.length <= 3) {
            console.log("Cannot delete - polygon must have at least 3 vertices");
            return;
        }
        
        const index = this.vertexEntities.indexOf(vertexEntity);
        if (index === -1) return;
        
        this.viewer.entities.remove(vertexEntity);
        this.vertexEntities.splice(index, 1);
        
        this.vertexEntities.forEach((vertex, idx) => {
            vertex.properties.vertexIndex = idx;
        });
        
        this.updatePolygonFromVertices();
        console.log(`Deleted vertex ${index}`);
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (this.editMode && this.editingEntity) {
                const currentHeight = this.editingEntity.polygon.extrudedHeight || 0;
                
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.editingEntity.polygon.extrudedHeight = currentHeight + 5;
                    console.log("Height increased to:", this.editingEntity.polygon.extrudedHeight);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.editingEntity.polygon.extrudedHeight = Math.max(0, currentHeight - 5);
                    console.log("Height decreased to:", this.editingEntity.polygon.extrudedHeight);
                } else if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    if (this.hoveredVertex) {
                        this.deleteVertex(this.hoveredVertex);
                    }
                }
            }
            
            if (this.moveMode && this.movingPolygon) {
                if (e.key === 'r' || e.key === 'R') {
                    e.preventDefault();
                    this.rotatePolygon(this.movingPolygon, 90);
                } else if (e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                    this.rotatePolygon(this.movingPolygon, -90);
                }
            }
        });
    }

    // Mouse event handlers
    handleLeftDown(event) {
        if (this.editMode) {
            const pickedObject = this.viewer.scene.pick(event.position);
            
            if (Cesium.defined(pickedObject) && pickedObject.id) {
                const entity = pickedObject.id;
                
                if (entity.properties && entity.properties.isVertex) {
                    this.draggedVertex = entity;
                    this.viewer.scene.screenSpaceCameraController.enableRotate = false;
                    this.viewer.scene.screenSpaceCameraController.enableTranslate = false;
                    console.log("Started dragging vertex");
                }
            }
        } else if (this.moveMode) {
            const ray = this.viewer.camera.getPickRay(event.position);
            this.moveStartPosition = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            
            if (Cesium.defined(this.moveStartPosition)) {
                this.viewer.scene.screenSpaceCameraController.enableRotate = false;
                this.viewer.scene.screenSpaceCameraController.enableTranslate = false;
            }
        }
    }

    handleLeftUp(event) {
        if (this.draggedVertex) {
            console.log("Stopped dragging vertex");
            this.draggedVertex = null;
            this.viewer.scene.screenSpaceCameraController.enableRotate = true;
            this.viewer.scene.screenSpaceCameraController.enableTranslate = true;
        } else if (this.moveMode && this.moveStartPosition) {
            this.moveStartPosition = null;
            this.viewer.scene.screenSpaceCameraController.enableRotate = true;
            this.viewer.scene.screenSpaceCameraController.enableTranslate = true;
        }
    }

    handleMouseMove(event) {
        if (this.draggedVertex) {
            const ray = this.viewer.camera.getPickRay(event.endPosition);
            const newPosition = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            
            if (Cesium.defined(newPosition)) {
                this.draggedVertex.position = newPosition;
                this.updatePolygonFromVertices();
            }
        } else if (this.moveMode && this.moveStartPosition) {
            const ray = this.viewer.camera.getPickRay(event.endPosition);
            const currentPosition = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            
            if (Cesium.defined(currentPosition)) {
                const offset = Cesium.Cartesian3.subtract(
                    currentPosition,
                    this.moveStartPosition,
                    new Cesium.Cartesian3()
                );
                this.updatePolygonPosition(offset);
                
                let hierarchy = this.movingPolygon.polygon.hierarchy;
                if (hierarchy instanceof Cesium.CallbackProperty) {
                    hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
                }
                if (typeof hierarchy.getValue === 'function') {
                    hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
                }
                if (hierarchy instanceof Cesium.PolygonHierarchy) {
                    this.polygonOriginalPositions = hierarchy.positions.slice();
                } else if (hierarchy.positions) {
                    this.polygonOriginalPositions = hierarchy.positions.slice();
                } else if (Array.isArray(hierarchy)) {
                    this.polygonOriginalPositions = hierarchy.slice();
                }
                this.moveStartPosition = currentPosition;
            }
        } else if (this.editMode) {
            const pickedObject = this.viewer.scene.pick(event.endPosition);
            if (Cesium.defined(pickedObject) && pickedObject.id) {
                const entity = pickedObject.id;
                if (entity.properties && entity.properties.isVertex) {
                    this.hoveredVertex = entity;
                } else {
                    this.hoveredVertex = null;
                }
            } else {
                this.hoveredVertex = null;
            }
        }
    }

    handleCtrlClick(event) {
        if (this.editMode) {
            const pickedObject = this.viewer.scene.pick(event.position);
            if (Cesium.defined(pickedObject) && pickedObject.id) {
                const entity = pickedObject.id;
                if (entity.properties && entity.properties.isVertex) {
                    const currentIndex = entity.properties.vertexIndex;
                    const nextIndex = (currentIndex + 1) % this.vertexEntities.length;
                    this.addVertexBetween(currentIndex, nextIndex);
                    return true; // Handled by editor
                }
            }
        }
        return false; // Not handled by editor
    }

    handleAltClick(event) {
        const pickedObject = this.viewer.scene.pick(event.position);
        if (Cesium.defined(pickedObject) && pickedObject.id) {
            const entity = pickedObject.id;
            if (entity.polygon && !entity.properties?.isVertex) {
                this.startEditingPolygon(entity);
            }
        }
    }

    handleShiftClick(event) {
        const pickedObject = this.viewer.scene.pick(event.position);
        if (Cesium.defined(pickedObject) && pickedObject.id) {
            const entity = pickedObject.id;
            if (entity.polygon && !entity.properties?.isVertex) {
                this.startMovingPolygon(entity);
            }
        }
    }

    handleDoubleClick(event) {
        const pickedObject = this.viewer.scene.pick(event.position);
        if (Cesium.defined(pickedObject) && pickedObject.id) {
            const entity = pickedObject.id;
            if (entity.polygon && !entity.properties?.isVertex) {
                this.startEditingPolygon(entity);
            }
        }
    }

    handleRightClick(event) {
        if (this.editMode) {
            this.stopEditingPolygon();
            return true;
        } else if (this.moveMode) {
            this.stopMovingPolygon();
            return true;
        }
        return false;
    }
}