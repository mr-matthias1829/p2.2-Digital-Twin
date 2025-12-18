import { vi } from 'vitest';

// Mock window object for browser globals
global.window = global;

// Mock Cesium globally BEFORE any modules load
global.Cesium = {
  CallbackProperty: class CallbackProperty {
    constructor(callback, isConstant) {
      this.callback = callback;
      this.isConstant = isConstant;
    }
  },
  ColorMaterialProperty: class ColorMaterialProperty {
    constructor(color) {
      this.color = color;
    }
  },
  PropertyBag: class PropertyBag {},
  PolygonHierarchy: class PolygonHierarchy {
    constructor(positions) {
      this.positions = positions;
    }
  },
  JulianDate: {
    now: () => ({})
  },
  Color: {
    YELLOW: { withAlpha: (a) => ({ alpha: a }), clone: function() { return this; } },
    RED: { clone: function() { return this; } },
    WHITE: { clone: function() { return this; } },
    BLUE: { clone: function() { return this; } },
    GREEN: { clone: function() { return this; } },
    fromCssColorString: vi.fn((hex) => ({ hex, clone: function() { return this; } }))
  },
  Cartesian3: {
    fromRadians: vi.fn((lon, lat, height) => ({ lon, lat, height }))
  },
  Cartographic: {
    fromCartesian: vi.fn((position) => ({
      longitude: 0,
      latitude: 0,
      height: 0
    }))
  },
  Math: {
    toDegrees: vi.fn((rad) => rad * 180 / Math.PI),
    toRadians: vi.fn((deg) => deg * Math.PI / 180)
  },
  Matrix3: {},
  Matrix4: {},
  Transforms: {},
  HeightReference: {
    CLAMP_TO_GROUND: 1,
    RELATIVE_TO_GROUND: 2,
    NONE: 0
  }
};

// Mock fetch for API calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: false,
    json: () => Promise.resolve([])
  })
);

// Mock global functions that TypeData might need
global.updateOccupationStats = vi.fn();