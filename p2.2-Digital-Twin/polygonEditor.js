// polygonEditor.js - Polygon editing functionality

class PolygonEditor {
    constructor(viewer) {
        this.viewer = viewer;
        this.editMode = false;
        this.editingEntity = null;
        this.vertexEntities = [];
        this.originalMaterial = null;
        this.draggedVertex = null;
        this.hoveredVertex = null;
        this.moveStart = null;
        this.setupKeyboardControls();
    }

    // Helper: return closest point on segment to 'point' (Cartesian3)
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
        if (!this.editMode || !this.vertexEntities.length) return;

        const scene = this.viewer.scene;
        const positions = this.vertexEntities.map(v => 
            v.position.getValue ? v.position.getValue(Cesium.JulianDate.now()) : v.position
        );

        // Add the first position at the end to close the polygon for edge calculation
        const positionsForEdges = [...positions, positions[0]];

        let closestEdgeIndex = -1;
        let minScreenDistSq = Number.MAX_VALUE;
        let closestProjection = null;

        // pixel tolerance (tune this: 8-20 is a reasonable range)
        const PIXEL_TOLERANCE = 12;
        const pixelTolSq = PIXEL_TOLERANCE * PIXEL_TOLERANCE;

        for (let i = 0; i < positionsForEdges.length - 1; i++) {
            const edgeStart = positionsForEdges[i];
            const edgeEnd = positionsForEdges[i + 1];

            // get closest point on the segment in world coords
            const projection = this.closestPointOnSegment(edgeStart, edgeEnd, position);

            // project to screen coordinates
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

        // If the click isn't close enough in screen space, don't add a vertex
        if (minScreenDistSq === Number.MAX_VALUE || minScreenDistSq > pixelTolSq) {
            console.log("Click not close enough to any polygon edge (screen tolerance).");
            return;
        }

        // Insert vertex after the start vertex of the closest edge
        const insertIndex = (closestEdgeIndex + 1) % this.vertexEntities.length;

        // Use the projection as the new vertex position for better placement on the edge
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

        // Update indices for all vertices
        this.vertexEntities.forEach((v, i) => v.properties.vertexIndex = i);

        this.updatePolygonFromVertices();
        console.log(`Added vertex at closest edge (edge ${closestEdgeIndex})`);
    }

    stopEditingPolygon() {
        if (!this.editMode) return;
        this.editMode = false;
        
        if (this.editingEntity && this.originalMaterial) {
            this.editingEntity.polygon.material = this.originalMaterial;
        }
        this.vertexEntities.forEach(v => this.viewer.entities.remove(v));
        this.vertexEntities = [];
        this.editingEntity = null;
        this.originalMaterial = null;
        this.draggedVertex = null;
        this.moveStart = null;
        this.viewer.scene.screenSpaceCameraController.enableRotate = true;
        this.viewer.scene.screenSpaceCameraController.enableTranslate = true;
        console.log("EDIT MODE OFF");
        if (window.clearPolygonInfo) window.clearPolygonInfo();
    }

    distanceToSegment(point, segmentStart, segmentEnd) {
        // Calculate squared distance between segmentStart and segmentEnd
        const segmentLengthSquared = Cesium.Cartesian3.distanceSquared(segmentStart, segmentEnd);
        
        if (segmentLengthSquared === 0) {
            // Segment is actually a point
            return Cesium.Cartesian3.distance(point, segmentStart);
        }
        
        // Calculate projection of point onto the segment
        const v = Cesium.Cartesian3.subtract(segmentEnd, segmentStart, new Cesium.Cartesian3());
        const w = Cesium.Cartesian3.subtract(point, segmentStart, new Cesium.Cartesian3());
        
        const dot = Cesium.Cartesian3.dot(w, v);
        const t = Math.max(0, Math.min(1, dot / segmentLengthSquared));
        
        // Calculate closest point on the segment
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
        if (drawingMode != "edit") return;
        if (this.editMode) this.stopEditingPolygon();
        
        this.editMode = true;
        this.editingEntity = entity;
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
        console.log(`Rotated ${degrees}°`);
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
        console.log(`Added vertex between ${index1} and ${index2}`);
    }

    deleteVertex(vertexEntity) {
        if (!this.editMode || this.vertexEntities.length <= 3) {
            return console.log("Cannot delete - min 3 vertices");
        }
        const index = this.vertexEntities.indexOf(vertexEntity);
        if (index === -1) return;
        this.viewer.entities.remove(vertexEntity);
        this.vertexEntities.splice(index, 1);
        this.vertexEntities.forEach((v, i) => v.properties.vertexIndex = i);
        this.updatePolygonFromVertices();
        console.log(`Deleted vertex ${index}`);
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (this.editMode && this.editingEntity) {
                const h = this.editingEntity.polygon.extrudedHeight || 0;

                    // Scaling height
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.editingEntity.polygon.extrudedHeight = h + 5;
                    console.log("Height:", h + 5);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.editingEntity.polygon.extrudedHeight = Math.max(0, h - 5);
                    console.log("Height:", Math.max(0, h - 5));

                    // Deleting vertex
                } else if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    if (this.hoveredVertex) this.deleteVertex(this.hoveredVertex);

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
        });
    }

    handleLeftDown(event) {
        if (!this.editMode) return;
        const picked = this.viewer.scene.pick(event.position);
        if (Cesium.defined(picked) && picked.id?.properties?.isVertex) {
            this.draggedVertex = picked.id;
            this.viewer.scene.screenSpaceCameraController.enableRotate = false;
            this.viewer.scene.screenSpaceCameraController.enableTranslate = false;
            console.log("Dragging vertex");
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
            if (this.draggedVertex) console.log("Stopped dragging");
            this.draggedVertex = null;
            this.moveStart = null;
            this.viewer.scene.screenSpaceCameraController.enableRotate = true;
            this.viewer.scene.screenSpaceCameraController.enableTranslate = true;
        }
    }

    handleMouseMove(event) {
        if (this.draggedVertex) {
            const ray = this.viewer.camera.getPickRay(event.endPosition);
            const newPos = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            if (Cesium.defined(newPos)) {
                this.draggedVertex.position = newPos;
                this.updatePolygonFromVertices();
            }
        } else if (this.editMode && this.moveStart) {
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
        } else if (this.editMode) {
            const picked = this.viewer.scene.pick(event.endPosition);
            this.hoveredVertex = (Cesium.defined(picked) && picked.id?.properties?.isVertex) ? picked.id : null;
        }
    }

    handleDoubleClick(event) {
        // If in edit mode, try to add a vertex on an edge
        if (this.editMode && this.editingEntity) {
            const ray = this.viewer.camera.getPickRay(event.position);
            if (!ray) return;
            
            const intersection = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            if (Cesium.defined(intersection)) {
                this.addVertexAtPosition(intersection, event.position);
                return;
            }
        }
        
        // Otherwise, check if clicking on a polygon to start editing
        const picked = this.viewer.scene.pick(event.position);
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
}