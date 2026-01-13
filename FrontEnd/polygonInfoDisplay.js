// polygonInfoDisplay.js - Handles the polygon/line information panel UI

// Utility: extract coordinates from a polygon entity's hierarchy
function _getPositionsFromHierarchy(hierarchy) {
    if (!hierarchy) return [];
    if (typeof hierarchy.getValue === 'function') {
        hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
    }
    if (hierarchy instanceof Cesium.PolygonHierarchy) {
        return hierarchy.positions || [];
    }
    if (Array.isArray(hierarchy)) return hierarchy;
    if (hierarchy.positions) return hierarchy.positions;
    return [];
}

// Utility: extract positions from polygon OR line entity
function _getPositionsFromEntity(entity) {
    if (!entity) return [];

    if (entity.polygon) {
        return _getPositionsFromHierarchy(entity.polygon.hierarchy);
    }

    if (entity.polyline) {
        let positions = entity.polyline.positions;
        if (typeof positions?.getValue === 'function') {
            positions = positions.getValue(Cesium.JulianDate.now());
        }
        return positions || [];
    }

    return [];
}

// Show polygon/line coordinates in the bottom-right container (if present)
window.showPolygonInfo = async function (entity) {
    try {
        const el = document.getElementById('polygonInfo');
        if (!el) return;
        el.style.display = 'block';

        // Nothing selected
        if (!entity || (!entity.polygon && !entity.polyline)) {
            el.innerHTML = '<div style="text-align: center; padding: 30px; color: #b0b0b0; font-size: 13px;">No polygon or line selected</div>';
            return;
        }

        const positions = _getPositionsFromEntity(entity);
        if (!positions || positions.length === 0) {
            el.innerHTML = '<div style="text-align: center; padding: 30px; color: #b0b0b0; font-size: 13px;">⚠️ No coordinates available</div>';
            return;
        }

        const isPolygon = !!entity.polygon;
        const isLine = !!entity.polyline;

        // Height, area, volume only for polygon
        let heightLine = '';
        let areaLine = '';
        let volumeLine = '';
        if (isPolygon) {
            let extruded = entity.polygon.extrudedHeight;
            let baseHeight = entity.polygon.height;
            function _getNumeric(val) {
                if (val == null) return undefined;
                if (typeof val === 'number') return val;
                if (val && typeof val.getValue === 'function') return val.getValue(Cesium.JulianDate.now());
                return undefined;
            }
            const extrudedVal = _getNumeric(extruded);
            const baseVal = _getNumeric(baseHeight);

            if (typeof extrudedVal === 'number') {
                heightLine = `<small>Height: ${Number(extrudedVal).toFixed(2)} m</small>`;
            } else if (typeof baseVal === 'number') {
                heightLine = `<small>Base height: ${Number(baseVal).toFixed(2)} m</small>`;
            }

            try {
                if (window.polygonUtils) {
                    if (typeof window.polygonUtils.computeAreaFromHierarchy === 'function') {
                        const area = await window.polygonUtils.computeAreaFromHierarchy(entity.polygon.hierarchy || positions);
                        if (typeof area === 'number') {
                            areaLine = `<small>Area: ${Number(area).toFixed(2)} m²</small>`;
                        }
                    }
                    if (typeof window.polygonUtils.computeVolumeFromEntity === 'function') {
                        const vol = await window.polygonUtils.computeVolumeFromEntity(entity);
                        if (vol && typeof vol.volume === 'number') {
                            volumeLine = `<small>Volume: ${Number(vol.volume).toFixed(2)} m³</small>`;
                        }
                    }
                }
            } catch (e) {
                console.warn('polygonUtils error - backend may be unavailable:', e);
            }
        }

        // Length for line
        let lengthLine = '';
        if (isLine && positions.length >= 2) {
            let totalLength = 0;
            for (let i = 1; i < positions.length; i++) {
                totalLength += Cesium.Cartesian3.distance(positions[i - 1], positions[i]);
            }
            lengthLine = `<small>Length: ${totalLength.toFixed(2)} m</small>`;
        }

        // Build HTML
        let html = '';

        // Scrollbar style
        html += '<style>';
        html += '#polygonInfo .coordinates-scroll::-webkit-scrollbar { width: 6px; }';
        html += '#polygonInfo .coordinates-scroll::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 3px; }';
        html += '#polygonInfo .coordinates-scroll::-webkit-scrollbar-thumb { background: rgba(100, 150, 255, 0.4); border-radius: 3px; }';
        html += '#polygonInfo .coordinates-scroll::-webkit-scrollbar-thumb:hover { background: rgba(100, 150, 255, 0.6); }';
        html += '</style>';

        // Header
        html += '<div style="margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid rgba(100, 150, 255, 0.2);">';
        html += `<div style="font-size: 15px; font-weight: 600; color: #a0c4ff; margin-bottom: 8px; letter-spacing: 0.3px;">${isPolygon ? 'Polygon' : 'Line'} Information</div>`;
        html += `<div style="color: #b0b0b0; font-size: 12px;">${positions.length} vertices</div>`;
        html += '</div>';

        // Polygon-specific UI
        if (isPolygon) {
            const currentName = entity.polygonName || '';
            html += '<div style="margin-bottom: 14px;">';
            html += '<div style="font-size: 12px; font-weight: 600; color: #80a0ff; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Polygon Name</div>';
            html += `<input type="text" id="polygonNameInput" value="${currentName.replace(/"/g,'&quot;')}" placeholder="Enter name..." style="width: calc(100% - 20px); padding: 8px 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(100,150,255,0.3); border-radius: 6px; color: #e0e0e0; font-size:13px; outline:none;" />`;
            html += '</div>';

            const hasNatureOnTop = entity.hasNatureOnTop || false;
            html += '<div style="margin-bottom: 14px; padding: 10px; background: rgba(100, 200, 100, 0.08); border: 1px solid rgba(100, 200, 100, 0.2); border-radius: 6px;">';
            html += '<label style="display:flex; align-items:center; cursor:pointer;">';
            html += `<input type="checkbox" id="natureOnTopCheckbox" ${hasNatureOnTop ? 'checked' : ''} style="margin-right:8px;width:16px;height:16px;" />`;
            html += '<div style="flex:1;"><div style="font-size:12px;font-weight:600;color:#90ee90;">Nature on Top (Green Roof)</div>';
            html += '<div style="font-size:10px;color:#b0b0b0;margin-top:2px;">Counts toward nature goal without increasing occupation</div></div></label></div>';
        }

        // Measurements section
        if (heightLine || areaLine || volumeLine || lengthLine) {
            html += '<div style="background: linear-gradient(135deg, rgba(100, 150, 255, 0.08), rgba(80, 130, 255, 0.05)); padding: 12px; border-radius: 8px; margin-bottom: 14px; border:1px solid rgba(100,150,255,0.15);">';
            html += '<div style="font-size:12px;font-weight:600;color:#80a0ff;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Measurements</div>';

            if (heightLine) {
                const heightVal = heightLine.match(/([\d.]+)/)?.[1] || '';
                html += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="color:#b0c4de;">Height:</span><span style="font-weight:600;color:#c0d4ee;">${heightVal} m</span></div>`;
            }
            if (areaLine) {
                const areaVal = areaLine.match(/([\d.]+)/)?.[1] || '';
                html += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="color:#b0c4de;">Area:</span><span style="font-weight:600;color:#90ee90;">${areaVal} m²</span></div>`;
            }
            if (volumeLine) {
                const volumeVal = volumeLine.match(/([\d.]+)/)?.[1] || '';
                html += `<div style="display:flex;justify-content:space-between;padding:6px 0;"><span style="color:#b0c4de;">Volume:</span><span style="font-weight:600;color:#ffa07a;">${volumeVal} m³</span></div>`;
            }
            if (lengthLine) {
                const lengthVal = lengthLine.match(/([\d.]+)/)?.[1] || '';
                html += `<div style="display:flex;justify-content:space-between;padding:6px 0;"><span style="color:#b0c4de;">Length:</span><span style="font-weight:600;color:#ffd700;">${lengthVal} m</span></div>`;
            }

            html += '</div>';
        }

        // Coordinates
        html += '<div style="font-size: 12px; font-weight: 600; color: #80a0ff; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Coordinates</div>';
        const scrollableStyle = positions.length >= 3 ? 'max-height: 80px; overflow-y:auto;' : '';
        html += `<div class="coordinates-scroll" style="background: rgba(0,0,0,0.2); padding:10px; border-radius:6px; font-family:'Consolas','Monaco',monospace; font-size:11px; line-height:1.6; ${scrollableStyle}">`;
        positions.forEach((cartesian,i)=>{
            const carto = Cesium.Cartographic.fromCartesian(cartesian);
            const lon = Cesium.Math.toDegrees(carto.longitude).toFixed(6);
            const lat = Cesium.Math.toDegrees(carto.latitude).toFixed(6);
            html += `<div style="padding:3px 0;color:#d0d0d0;"><span style="color:#80a0ff;font-weight:600;display:inline-block;width:25px;">${i+1}:</span><span style="color:#90ee90;">${lat}</span>, <span style="color:#ffa07a;">${lon}</span></div>`;
        });
        html += '</div>';

        el.innerHTML = html;

        // Polygon-only event listeners
        if (isPolygon) {
            setTimeout(() => {
                const nameInput = document.getElementById('polygonNameInput');
                if (nameInput && entity) {
                    nameInput.addEventListener('input',(e)=>{
                        entity.polygonName = e.target.value;
                        if (entity.polygonId && typeof polygonAPI !== 'undefined') {
                            clearTimeout(entity._nameSaveTimeout);
                            entity._nameSaveTimeout = setTimeout(()=>{
                                polygonAPI.savePolygon(entity)
                                    .then(()=>console.log('✓ Polygon name saved'))
                                    .catch(err=>console.error('Failed to save polygon name:',err));
                            },1000);
                        }
                    });
                }
                const natureCheckbox = document.getElementById('natureOnTopCheckbox');
                if (natureCheckbox && entity) {
                    natureCheckbox.addEventListener('change',(e)=>{
                        entity.hasNatureOnTop = e.target.checked;
                        if (typeof applyTypeInitPolygon === 'function') applyTypeInitPolygon(entity);
                        if (entity.polygonId && typeof polygonAPI !== 'undefined') {
                            polygonAPI.savePolygon(entity)
                                .then(()=>{ console.log('✓ Nature on top status saved'); if (typeof window.updateGoalsDisplay==='function') window.updateGoalsDisplay(); })
                                .catch(err=>console.error('Failed to save nature on top status:',err));
                        }
                    });
                }
            },0);
        }

    } catch(e){
        console.warn('showPolygonInfo error',e);
    }
};

window.clearPolygonInfo = function () {
    const el = document.getElementById('polygonInfo');
    if (!el) return;
    el.innerHTML = '';
    el.style.display = 'none';
};