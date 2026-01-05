import { vi } from 'vitest';

// Mock window object for browser globals
vi.stubGlobal('window', global);

// Mock Cesium globally BEFORE any modules load
import { createCesiumMock } from './mocks/CesiumMock';

vi.stubGlobal('Cesium', createCesiumMock());

// Mock fetch for API calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: false,
    json: () => Promise.resolve([])
  })
);

// Mock global functions that TypeData might need
global.updateOccupationStats = vi.fn();