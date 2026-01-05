// polygonInfoDisplay.js - Handles the polygon information panel UI

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

// Show polygon coordinates in the bottom-right container (if present)
window.showPolygonInfo = async function (entity) {
    try {
        const el = document.getElementById('polygonInfo');
        if (!el) return;
        // Ensure the panel is visible when showing info
        el.style.display = 'block';
        if (!entity || !entity.polygon) {
            el.innerHTML = '<div style="text-align: center; padding: 30px; color: #b0b0b0; font-size: 13px;">No polygon selected</div>';
            return;
        }

        const positions = _getPositionsFromHierarchy(entity.polygon.hierarchy);
        if (!positions || positions.length === 0) {
            el.innerHTML = '<div style="text-align: center; padding: 30px; color: #b0b0b0; font-size: 13px;">⚠️ No coordinates available</div>';
            return;
        }

        // Compute height (prefer extrudedHeight, fallback to height)
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

        let heightLine = '';
        if (typeof extrudedVal === 'number') {
            heightLine = `<small>Height: ${Number(extrudedVal).toFixed(2)} m</small>`;
        } else if (typeof baseVal === 'number') {
            heightLine = `<small>Base height: ${Number(baseVal).toFixed(2)} m</small>`;
        }

        // Compute area (always) and volume (if height present) using backend API via polygonUtils
        let areaLine = '';
        let volumeLine = '';
        let serverDisconnected = false;
        
        try {
            if (window.polygonUtils) {
                // Show loading indicator while calculating
                el.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 15px; font-weight: 600; color: #a0c4ff; margin-bottom: 12px;">Polygon Information</div>
                        <div style="color: #b0b0b0; font-size: 12px; margin-bottom: 16px;">${positions.length} vertices</div>
                        <div style="color: #80a0ff; font-size: 13px;">
                            <span style="display: inline-block; animation: pulse 1.5s ease-in-out infinite;">⏳</span>
                            Calculating measurements...
                        </div>
                    </div>
                    <style>
                        @keyframes pulse {
                            0%, 100% { opacity: 0.4; transform: scale(1); }
                            50% { opacity: 1; transform: scale(1.1); }
                        }
                    </style>
                `;

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
            serverDisconnected = true;
        }

        // If server is disconnected, show warning message instead of calculation results
        if (serverDisconnected || (window.polygonUtils && !window.polygonUtils.isServerConnected())) {
            areaLine = '';
            volumeLine = '';
        }

        let html = '';
        
        // Add style for coordinates scrollbar
        html += '<style>';
        html += '#polygonInfo .coordinates-scroll::-webkit-scrollbar { width: 6px; }';
        html += '#polygonInfo .coordinates-scroll::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 3px; }';
        html += '#polygonInfo .coordinates-scroll::-webkit-scrollbar-thumb { background: rgba(100, 150, 255, 0.4); border-radius: 3px; }';
        html += '#polygonInfo .coordinates-scroll::-webkit-scrollbar-thumb:hover { background: rgba(100, 150, 255, 0.6); }';
        html += '</style>';
        
        // Show server disconnected warning at the top if server is unavailable
        if (serverDisconnected || (window.polygonUtils && !window.polygonUtils.isServerConnected())) {
            html += '<div style="background: linear-gradient(135deg, rgba(255,70,70,0.15), rgba(255,50,50,0.1)); padding: 12px; margin-bottom: 14px; border-radius: 8px; border-left: 3px solid #ff5252; box-shadow: 0 2px 8px rgba(255,82,82,0.2);">';
            html += '<b style="color: #ff6b6b; font-size: 13px; display: flex; align-items: center; gap: 6px;"><span style="font-size: 16px;">⚠</span> Server Disconnected</b>';
            html += '<small style="color: #ffb3b3; display: block; margin-top: 6px; line-height: 1.4;">Cannot calculate area and volume.<br/>Only showing coordinates.</small>';
            html += '</div>';
        }
        
        // Header section with title
        html += '<div style="margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid rgba(100, 150, 255, 0.2);">';
        html += '<div style="font-size: 15px; font-weight: 600; color: #a0c4ff; margin-bottom: 8px; letter-spacing: 0.3px;"> Polygon Information</div>';
        html += `<div style="color: #b0b0b0; font-size: 12px;">${positions.length} vertices</div>`;
        html += '</div>';
        
        // Name input section
        const currentName = entity.polygonName || '';
        html += '<div style="margin-bottom: 14px;">';
        html += '<div style="font-size: 12px; font-weight: 600; color: #80a0ff; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Polygon Name</div>';
        html += '<input type="text" id="polygonNameInput" value="' + currentName.replace(/"/g, '&quot;') + '" ';
        html += 'placeholder="Enter name..." ';
        html += 'style="width: calc(100% - 20px); padding: 8px 10px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(100, 150, 255, 0.3); border-radius: 6px; color: #e0e0e0; font-size: 13px; font-family: Arial, sans-serif; outline: none; transition: all 0.2s;"';
        html += 'onfocus="this.style.borderColor=\'rgba(100, 150, 255, 0.6)\'; this.style.background=\'rgba(0, 0, 0, 0.4)\';"';
        html += 'onblur="this.style.borderColor=\'rgba(100, 150, 255, 0.3)\'; this.style.background=\'rgba(0, 0, 0, 0.3)\';"';
        html += '/>';
        html += '</div>';
        
        // Nature on top checkbox (green roof option)
        const hasNatureOnTop = entity.hasNatureOnTop || false;
        html += '<div style="margin-bottom: 14px; padding: 10px; background: rgba(100, 200, 100, 0.08); border: 1px solid rgba(100, 200, 100, 0.2); border-radius: 6px;">';
        html += '<label style="display: flex; align-items: center; cursor: pointer; user-select: none;">';
        html += '<input type="checkbox" id="natureOnTopCheckbox" ' + (hasNatureOnTop ? 'checked' : '') + ' ';
        html += 'style="margin-right: 8px; cursor: pointer; width: 16px; height: 16px;"';
        html += '/>';
        html += '<div style="flex: 1;">';
        html += '<div style="font-size: 12px; font-weight: 600; color: #90ee90;">Nature on Top (Green Roof)</div>';
        html += '<div style="font-size: 10px; color: #b0b0b0; margin-top: 2px;">Counts toward nature goal without increasing occupation</div>';
        html += '</div>';
        html += '</label>';
        html += '</div>';
        
        // Measurements section
        if (heightLine || areaLine || volumeLine) {
            html += '<div style="background: linear-gradient(135deg, rgba(100, 150, 255, 0.08), rgba(80, 130, 255, 0.05)); padding: 12px; border-radius: 8px; margin-bottom: 14px; border: 1px solid rgba(100, 150, 255, 0.15);">';
            html += '<div style="font-size: 12px; font-weight: 600; color: #80a0ff; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Measurements</div>';
            
            if (heightLine) {
                const heightMatch = heightLine.match(/([\d.]+)/);
                const heightVal = heightMatch ? heightMatch[1] : '';
                html += `<div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">`;
                html += `<span style="color: #b0c4de;">Height:</span>`;
                html += `<span style="font-weight: 600; color: #c0d4ee;">${heightVal} m</span>`;
                html += `</div>`;
            }
            
            if (areaLine) {
                const areaMatch = areaLine.match(/([\d.]+)/);
                const areaVal = areaMatch ? areaMatch[1] : '';
                html += `<div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">`;
                html += `<span style="color: #b0c4de;">Area:</span>`;
                html += `<span style="font-weight: 600; color: #90ee90;">${areaVal} m²</span>`;
                html += `</div>`;
            }
            
            if (volumeLine) {
                const volumeMatch = volumeLine.match(/([\d.]+)/);
                const volumeVal = volumeMatch ? volumeMatch[1] : '';
                html += `<div style="display: flex; justify-content: space-between; padding: 6px 0;">`;
                html += `<span style="color: #b0c4de;">Volume:</span>`;
                html += `<span style="font-weight: 600; color: #ffa07a;">${volumeVal} m³</span>`;
                html += `</div>`;
            }
            
            html += '</div>';
        }
        
        // Coordinates section
        html += '<div style="font-size: 12px; font-weight: 600; color: #80a0ff; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Coordinates</div>';
        
        // Add scrollable container if 3 or more coordinates
        const scrollableStyle = positions.length >= 3 ? 'max-height: 80px; overflow-y: auto;' : '';
        html += `<div class="coordinates-scroll" style="background: rgba(0, 0, 0, 0.2); padding: 10px; border-radius: 6px; font-family: 'Consolas', 'Monaco', monospace; font-size: 11px; line-height: 1.6; ${scrollableStyle}">`;
        
        positions.forEach((cartesian, i) => {
            const carto = Cesium.Cartographic.fromCartesian(cartesian);
            const lon = Cesium.Math.toDegrees(carto.longitude).toFixed(6);
            const lat = Cesium.Math.toDegrees(carto.latitude).toFixed(6);
            html += `<div style="padding: 3px 0; color: #d0d0d0;">`;
            html += `<span style="color: #80a0ff; font-weight: 600; display: inline-block; width: 25px;">${i + 1}:</span>`;
            html += `<span style="color: #90ee90;">${lat}</span>, `;
            html += `<span style="color: #ffa07a;">${lon}</span>`;
            html += `</div>`;
        });
        html += '</div>';
        
        el.innerHTML = html;
        
        // Set up name input event listener
        setTimeout(() => {
            const nameInput = document.getElementById('polygonNameInput');
            if (nameInput && entity) {
                nameInput.addEventListener('input', (e) => {
                    entity.polygonName = e.target.value;
                    
                    // Save to database if entity has an ID
                    if (entity.polygonId && typeof polygonAPI !== 'undefined') {
                        // Debounce the save
                        clearTimeout(entity._nameSaveTimeout);
                        entity._nameSaveTimeout = setTimeout(() => {
                            polygonAPI.savePolygon(entity)
                                .then(() => console.log('✓ Polygon name saved'))
                                .catch(err => console.error('Failed to save polygon name:', err));
                        }, 1000);
                    }
                });
            }
            
            // Set up nature on top checkbox event listener
            const natureCheckbox = document.getElementById('natureOnTopCheckbox');
            if (natureCheckbox && entity) {
                natureCheckbox.addEventListener('change', (e) => {
                    entity.hasNatureOnTop = e.target.checked;
                    
                    // Update visual appearance immediately (forces callback property to re-evaluate)
                    if (typeof applyTypeInitPolygon === 'function') {
                        applyTypeInitPolygon(entity);
                    }
                    
                    // Save to database immediately
                    if (entity.polygonId && typeof polygonAPI !== 'undefined') {
                        polygonAPI.savePolygon(entity)
                            .then(() => {
                                console.log('✓ Nature on top status saved');
                                // Refresh goals to update nature percentage
                                if (typeof window.updateGoalsDisplay === 'function') {
                                    window.updateGoalsDisplay();
                                }
                            })
                            .catch(err => console.error('Failed to save nature on top status:', err));
                    }
                });
            }
        }, 0);
    } catch (e) {
        console.warn('showPolygonInfo error', e);
    }
};

window.clearPolygonInfo = function () {
    const el = document.getElementById('polygonInfo');
    if (!el) return;
    // Hide the empty panel to avoid the thin visible strip when closed
    el.innerHTML = '';
    el.style.display = 'none';
};
