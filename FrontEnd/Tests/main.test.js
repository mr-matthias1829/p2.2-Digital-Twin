import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';


// Welcome to the hell that is getting all the resources that main.js needs
// This is maybe rather unomptimzed, but main.js basically needs nearly everything mocked
// Which makes sense since it's the center of everything
// Still very annoyingly large mocking script though that is required to run these tests

// More Cesium mocks
global.Cesium.Viewer = vi.fn();
global.Cesium.OpenStreetMapImageryProvider = vi.fn(function(opts) { 
  return { opts }; 
});

global.Cesium.ScreenSpaceEventHandler = vi.fn(function() { 
  return { 
    setInputAction: vi.fn(), 
    destroy: vi.fn() 
  }; 
});

global.Cesium.ScreenSpaceEventType = {
  LEFT_CLICK: 'LEFT_CLICK',
  LEFT_DOWN: 'LEFT_DOWN',
  LEFT_UP: 'LEFT_UP',
  LEFT_DOUBLE_CLICK: 'LEFT_DOUBLE_CLICK',
  RIGHT_CLICK: 'RIGHT_CLICK',
  MOUSE_MOVE: 'MOUSE_MOVE'
};

// Mock dependencies that main.js needs
global.UIsetup = vi.fn();
global.initializeGoalsUI = vi.fn();
global.getAllModelIDsAsync = vi.fn(() => Promise.resolve(['model1', 'model2']));
global.preloadModels = vi.fn();
global.loadBuildingTypesFromAPI = vi.fn(() => Promise.resolve());
global.ObjectEditor = vi.fn(function() {
  return {
    editMode: false,
    stopEditing: vi.fn(),
    handleLeftDown: vi.fn(),
    handleLeftUp: vi.fn(),
    handleMouseMove: vi.fn(),
    handleDoubleClick: vi.fn(() => false),
    handleRightClick: vi.fn(() => false)
  };
});
global.server = vi.fn();
global.OllamaAnalyzer = vi.fn();
global.applyTypeInitPolygon = vi.fn();
global.spawnModel = vi.fn();
global.showPolygonDataInDataMenu = vi.fn();
global.updateGoalsDisplay = vi.fn();
global.getTypeById = vi.fn((id) => id);
global.getTypeProperty = vi.fn(() => null);
global._getPositionsFromHierarchy = vi.fn((hierarchy) => {
  if (hierarchy && hierarchy.getValue) {
    const value = hierarchy.getValue();
    return value.positions || [];
  }
  return hierarchy?.positions || [];
});

// Mock boundsChecker
global.boundsChecker = {
  validateAndMarkPolygon: vi.fn(() => true),
  getSpoordokEntity: vi.fn(() => null),
  getPositionsFromHierarchy: vi.fn((hierarchy) => {
    if (hierarchy && hierarchy.getValue) {
      const value = hierarchy.getValue();
      return value.positions || [];
    }
    return hierarchy?.positions || [];
  }),
  isPolygonInsideBounds: vi.fn(() => true)
};

// Mock polygonAPI
global.polygonAPI = {
  savePolygon: vi.fn(() => Promise.resolve()),
  loadAllPolygons: vi.fn(() => Promise.resolve())
};

// Mock the state change callback system
const stateChangeCallbacks = {};
global.onUIStateChange = vi.fn((event, callback) => {
  stateChangeCallbacks[event] = callback;
});

// Helper to trigger state changes
global.triggerStateChange = (event, value) => {
  if (stateChangeCallbacks[event]) {
    stateChangeCallbacks[event](value);
  }
};

// NOW import the actual main.js file
// This will execute the code and expose the functions on window/global
await import('../main.js');





describe('main', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset state change callbacks
    Object.keys(stateChangeCallbacks).forEach(key => delete stateChangeCallbacks[key]);
    
    // Mock viewer with proper entity tracking
    const mockEntities = [];
    global.viewer = {
      entities: {
        add: vi.fn((entity) => {
          mockEntities.push(entity);
          return entity;
        }),
        remove: vi.fn((entity) => {
          const index = mockEntities.indexOf(entity);
          if (index > -1) mockEntities.splice(index, 1);
        }),
        values: mockEntities
      },
      cesiumWidget: {
        screenSpaceEventHandler: {
          removeInputAction: vi.fn()
        }
      },
      canvas: {},
      camera: {
        getPickRay: vi.fn(() => ({}))
      },
      scene: {
        globe: {
          pick: vi.fn(() => ({ x: 1, y: 2, z: 3 })),
          maximumScreenSpaceError: 1
        },
        pick: vi.fn()
      },
      imageryLayers: {
        removeAll: vi.fn(),
        addImageryProvider: vi.fn()
      }
    };
    
    // Reset Editor
    global.Editor = new global.ObjectEditor(global.viewer);
    
    // Reset drawing state by setting the global properties
    global.drawingMode = 'data';
    global.objType = 'none';
    global.modelToCreate = null;
    global.activeShapePoints = [];
    global.activeShape = null;
    global.floatingPoint = null;
    global.modelToCreateDEFAULT = null;
    global.objTypeDEFAULT = 'none';
    
    // Reset Cesium.defined
    global.Cesium.defined.mockImplementation((val) => val !== undefined && val !== null);
  });

  describe('handleClickToDraw()', () => {
    let mockPosition;
    
    beforeEach(() => {
      mockPosition = { x: 1, y: 2, z: 3 };
      global.Cesium.defined.mockReturnValue(true);
    });

    it('returns early if earthPosition is undefined', () => {
      global.Cesium.defined.mockReturnValue(false);
      
      global.handleClickToDraw(undefined);
      
      expect(global.viewer.entities.add).not.toHaveBeenCalled();
      expect(global.spawnModel).not.toHaveBeenCalled();
    });

    it('spawns model when in model mode', () => {
      global.drawingMode = 'model';
      global.modelToCreate = 'model1';
      global.Cesium.Cartographic.fromCartesian.mockReturnValue({
        longitude: 0.1,
        latitude: 0.2
      });
      global.Cesium.Math.toDegrees.mockImplementation((val) => val * 57.2958);
      
      global.handleClickToDraw(mockPosition);
      
      expect(global.spawnModel).toHaveBeenCalledWith(
        'model1',
        expect.objectContaining({ 
          lon: expect.any(Number), 
          lat: expect.any(Number) 
        }),
        0
      );
    });

    it('prevents polygon drawing when objType is "none"', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      global.drawingMode = 'polygon';
      global.objType = 'none';
      
      global.handleClickToDraw(mockPosition);
      
      expect(consoleSpy).toHaveBeenCalledWith("⚠ Please select a type before drawing a polygon");
      expect(global.activeShapePoints.length).toBe(0);
      
      consoleSpy.mockRestore();
    });

    it('creates first point and shape on first click in polygon mode', () => {
      global.drawingMode = 'polygon';
      global.objType = 'commercial_building';
      global.activeShapePoints = [];
      
      global.handleClickToDraw(mockPosition);
      
      // Should have created entities and added points
      expect(global.viewer.entities.add).toHaveBeenCalled();
      expect(global.activeShapePoints.length).toBeGreaterThan(0);
      expect(global.activeShape).toBeDefined();
      expect(global.floatingPoint).toBeDefined();
    });

    it('adds subsequent points correctly', () => {
      global.drawingMode = 'polygon';
      global.objType = 'commercial_building';
      const pos1 = { x: 1, y: 2, z: 3 };
      const pos2 = { x: 4, y: 5, z: 6 };
      
      // First click
      global.handleClickToDraw(pos1);
      const lengthAfterFirst = global.activeShapePoints.length;
      
      // Second click
      global.handleClickToDraw(pos2);
      
      // Should have added more points
      expect(global.activeShapePoints.length).toBeGreaterThan(lengthAfterFirst);
    });

    it('works in line mode', () => {
      global.drawingMode = 'line';
      global.activeShapePoints = [];
      
      global.handleClickToDraw(mockPosition);
      
      expect(global.viewer.entities.add).toHaveBeenCalled();
      expect(global.activeShapePoints.length).toBeGreaterThan(0);
    });
  });

  describe('terminateShape()', () => {
    beforeEach(() => {
      global.drawingMode = 'polygon';
      global.objType = 'commercial_building';
    });

    it('does nothing when no active shape points', () => {
      global.activeShapePoints = [];
      const initialCallCount = global.viewer.entities.add.mock.calls.length;
      
      global.terminateShape();
      
      // Should not add any new entities
      expect(global.viewer.entities.add.mock.calls.length).toBe(initialCallCount);
    });

    it('prevents polygon creation with fewer than 3 points', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      // Set up with only 2 points (will be 1 after pop in terminateShape)
      global.activeShapePoints = [
        { x: 1, y: 2, z: 3 },
        { x: 4, y: 5, z: 6 }
      ];
      global.floatingPoint = { id: 'floating' };
      global.activeShape = { id: 'shape' };
      
      global.terminateShape();
      
      expect(consoleSpy).toHaveBeenCalledWith("⚠ Need at least 3 points for a polygon");
      expect(global.viewer.entities.remove).toHaveBeenCalled();
      expect(global.activeShapePoints).toHaveLength(0);
      
      consoleSpy.mockRestore();
    });

    it('creates final polygon with 3 or more points', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      // 4 points: 3 actual + 1 floating (will be 3 after pop)
      global.activeShapePoints = [
        { x: 1, y: 2, z: 3 },
        { x: 4, y: 5, z: 6 },
        { x: 7, y: 8, z: 9 },
        { x: 10, y: 11, z: 12 }
      ];
      global.floatingPoint = { id: 'floating' };
      global.activeShape = { id: 'shape' };
      
      global.terminateShape();
      
      // Should have created a final polygon
      const polygonCalls = global.viewer.entities.add.mock.calls.filter(call => 
        call[0]?.polygon?.hierarchy instanceof Cesium.PolygonHierarchy
      );
      expect(polygonCalls.length).toBeGreaterThan(0);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Polygon created'));
      
      consoleSpy.mockRestore();
    });

    it('applies type and validates bounds', () => {
      global.activeShapePoints = [
        { x: 1, y: 2, z: 3 },
        { x: 4, y: 5, z: 6 },
        { x: 7, y: 8, z: 9 },
        { x: 10, y: 11, z: 12 }
      ];
      global.floatingPoint = { id: 'floating' };
      global.activeShape = { id: 'shape' };
      
      global.terminateShape();
      
      expect(global.applyTypeInitPolygon).toHaveBeenCalled();
      expect(global.boundsChecker.validateAndMarkPolygon).toHaveBeenCalled();
      expect(global.polygonAPI.savePolygon).toHaveBeenCalled();
    });

    it('cleans up drawing state after completion', () => {
      global.activeShapePoints = [
        { x: 1, y: 2, z: 3 },
        { x: 4, y: 5, z: 6 },
        { x: 7, y: 8, z: 9 },
        { x: 10, y: 11, z: 12 }
      ];
      global.floatingPoint = { id: 'floating' };
      global.activeShape = { id: 'shape' };
      
      global.terminateShape();
      
      expect(global.floatingPoint).toBeUndefined();
      expect(global.activeShape).toBeUndefined();
      expect(global.activeShapePoints).toHaveLength(0);
    });

    it('handles line mode correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      global.drawingMode = 'line';
      global.activeShapePoints = [
        { x: 1, y: 2, z: 3 },
        { x: 4, y: 5, z: 6 }
      ];
      global.floatingPoint = { id: 'floating' };
      global.activeShape = { id: 'shape' };
      
      global.terminateShape();
      
      expect(global.viewer.entities.remove).toHaveBeenCalled();
      expect(global.activeShapePoints).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Line created'));
      
      consoleSpy.mockRestore();
    });
  });

  describe('subscribeToStateChangesSetup()', () => {
    beforeEach(() => {
      // Re-run setup to register callbacks
      global.subscribeToStateChangesSetup();
    });

    it('registers all required state change handlers', () => {
      expect(global.onUIStateChange).toHaveBeenCalledWith('modeSelect', expect.any(Function));
      expect(global.onUIStateChange).toHaveBeenCalledWith('objtype', expect.any(Function));
      expect(global.onUIStateChange).toHaveBeenCalledWith('modelselect', expect.any(Function));
    });

    it('terminates shape when switching modes while drawing', () => {
      global.drawingMode = 'polygon';
      global.activeShapePoints = [{ x: 1, y: 2, z: 3 }];
      global.activeShape = { id: 'shape' };
      global.floatingPoint = { id: 'floating' };
      
      // Trigger mode change
      global.triggerStateChange('modeSelect', 'edit');
      
      // Shape should be terminated (cleaned up)
      expect(global.activeShapePoints).toHaveLength(0);
      expect(global.drawingMode).toBe('edit');
    });

    it('stops editor when leaving edit mode', () => {
      global.drawingMode = 'edit';
      const stopEditingSpy = vi.spyOn(global.Editor, 'stopEditing');
      
      global.triggerStateChange('modeSelect', 'polygon');
      
      expect(stopEditingSpy).toHaveBeenCalled();
    });

    it('updates objType when changed', () => {
      global.triggerStateChange('objtype', 'residential_building');
      
      expect(global.objType).toBe('residential_building');
    });

    it('updates modelToCreate when changed', () => {
      global.triggerStateChange('modelselect', 'newModel123');
      
      expect(global.modelToCreate).toBe('newModel123');
    });
  });

  describe('createPoint()', () => {
    it('creates a point entity at the given position', () => {
      const position = { x: 10, y: 20, z: 30 };
      
      const point = global.createPoint(position);
      
      expect(global.viewer.entities.add).toHaveBeenCalledWith({
        position: position
      });
      expect(point).toBeDefined();
    });
  });

  describe('drawShape()', () => {
    it('creates a line when in line mode', () => {
      global.drawingMode = 'line';
      const positions = [{ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }];
      
      const shape = global.drawShape(positions);
      
      const polylineCalls = global.viewer.entities.add.mock.calls.filter(call => call[0]?.polyline);
      expect(polylineCalls.length).toBeGreaterThan(0);
      expect(shape).toBeDefined();
    });

    it('creates a polygon when in polygon mode', () => {
      global.drawingMode = 'polygon';
      global.objType = 'residential_building';
      const hierarchy = new Cesium.PolygonHierarchy([{ x: 1, y: 2, z: 3 }]);
      
      const shape = global.drawShape(hierarchy);
      
      const polygonCalls = global.viewer.entities.add.mock.calls.filter(call => call[0]?.polygon);
      expect(polygonCalls.length).toBeGreaterThan(0);
      expect(global.applyTypeInitPolygon).toHaveBeenCalled();
      expect(shape).toBeDefined();
    });
  });
});