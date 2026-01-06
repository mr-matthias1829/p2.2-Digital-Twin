package com.digitaltwin.spoordok;

import com.dto.PolygonDataResponse;
import com.model.BuildingType;
import com.model.Polygon;
import com.service.BuildingTypeService;
import com.service.PolygonDataServiceImpl;
import com.service.PolygonService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PolygonDataServiceImplTest {

    @Mock
    private PolygonService polygonService;

    @Mock
    private BuildingTypeService buildingTypeService;

    @InjectMocks
    private PolygonDataServiceImpl polygonDataService;

    private Polygon testPolygon;
    private BuildingType testBuildingType;


    /**
     * Testing for the PolygonDataService:
     * 1. default expected behavior with volume
     * 2. default expected behavior with area
     * 3. given a null polygon
     * 4. given a not existing type
     * 5. given no type
     * 6. attempting to calculate volume with null volume
     * 7. repeat of first test with different values (maybe redundant)
     */

    @BeforeEach
    void setUp() {
        // Create a test polygon
        testPolygon = new Polygon();
        testPolygon.setId(1L);
        testPolygon.setBuildingType("apartment");
        testPolygon.setHeight(10.0);

        // Create a test building type (volume-based)
        testBuildingType = new BuildingType();
        testBuildingType.setTypeId("apartment");
        testBuildingType.setColorHex("#8E24AA");
        testBuildingType.setCost(300.0);      // €300 per m³
        testBuildingType.setIncome(12.0);     // 12% income
        testBuildingType.setPeople(0.006);    // 0.006 people per m³
        testBuildingType.setLivability(5.0);  // Livability score 5
        testBuildingType.setCalculationBase("volume");
    }

    @Test
    void testCalculatePolygonData_WithVolume_Success() {
        // Test that checks expected default behavior

        // Arrange
        Long polygonId = 1L;
        Double area = 100.0;      // 100 m²
        Double volume = 1000.0;   // 1000 m³

        when(polygonService.getPolygonById(polygonId)).thenReturn(testPolygon);
        when(buildingTypeService.getBuildingTypeByTypeId("apartment"))
                .thenReturn(Optional.of(testBuildingType));

        // Act
        PolygonDataResponse response = polygonDataService.calculatePolygonData(polygonId, area, volume);

        // Assert
        assertNotNull(response);
        assertEquals(300000.0, response.getCost());        // 300 * 1000
        assertEquals(36000.0, response.getIncome());       // 300000 * 0.12
        assertEquals(6.0, response.getPeople());           // 0.006 * 1000
        assertEquals(5.0, response.getLivability());       // Fixed score
        assertEquals(1000.0, response.getMeasurement());
        assertEquals("volume", response.getCalculationBase());

        // Verify interactions
        verify(polygonService, times(1)).getPolygonById(polygonId);
        verify(buildingTypeService, times(1)).getBuildingTypeByTypeId("apartment");
    }

    @Test
    void testCalculatePolygonData_WithAreaBase_Success() {
        // Test that checks expected default behavior, this time with area instead of volume

        // Arrange
        Long polygonId = 1L;
        Double area = 100.0;
        Double volume = 0.0;

        // Create area-based building type (like nature or parking)
        BuildingType areaBuildingType = new BuildingType();
        areaBuildingType.setTypeId("nature");
        areaBuildingType.setCost(150.0);      // €150 per m²
        areaBuildingType.setIncome(0.0);
        areaBuildingType.setPeople(0.0);
        areaBuildingType.setLivability(10.0);
        areaBuildingType.setCalculationBase("area");

        testPolygon.setBuildingType("nature");

        when(polygonService.getPolygonById(polygonId)).thenReturn(testPolygon);
        when(buildingTypeService.getBuildingTypeByTypeId("nature"))
                .thenReturn(Optional.of(areaBuildingType));

        // Act
        PolygonDataResponse response = polygonDataService.calculatePolygonData(polygonId, area, volume);

        // Assert
        assertNotNull(response);
        assertEquals(15000.0, response.getCost());         // 150 * 100
        assertEquals(0.0, response.getIncome());
        assertEquals(0.0, response.getPeople());
        assertEquals(10.0, response.getLivability());
        assertEquals(100.0, response.getMeasurement());
        assertEquals("area", response.getCalculationBase());
    }

    @Test
    void testCalculatePolygonData_PolygonNotFound_ReturnsZeros() {
        // Test that checks what happens when no polygon is given

        // Arrange
        Long polygonId = 999L;
        Double area = 100.0;
        Double volume = 1000.0;

        when(polygonService.getPolygonById(polygonId)).thenReturn(null);

        // Act
        PolygonDataResponse response = polygonDataService.calculatePolygonData(polygonId, area, volume);

        // Assert
        assertNotNull(response);
        assertEquals(0.0, response.getCost());
        assertEquals(0.0, response.getIncome());
        assertEquals(0.0, response.getPeople());
        assertEquals(0.0, response.getLivability());
        assertEquals(0.0, response.getMeasurement());
        assertEquals("unknown", response.getCalculationBase());

        verify(polygonService, times(1)).getPolygonById(polygonId);
        verify(buildingTypeService, never()).getBuildingTypeByTypeId(anyString());
    }

    @Test
    void testCalculatePolygonData_NoBuildingType_ReturnsZeros() {
        // Test that checks what happens when the 'none' type is given, a type that doesn't exist
        // In the backend this should all return 0
        // In the frontend there's a different behavior, that falls back to a default type

        // Arrange
        Long polygonId = 1L;
        Double area = 100.0;
        Double volume = 1000.0;

        testPolygon.setBuildingType("none");

        when(polygonService.getPolygonById(polygonId)).thenReturn(testPolygon);

        // Act
        PolygonDataResponse response = polygonDataService.calculatePolygonData(polygonId, area, volume);

        // Assert
        assertNotNull(response);
        assertEquals(0.0, response.getCost());
        assertEquals(0.0, response.getIncome());
        assertEquals(0.0, response.getPeople());
        assertEquals(0.0, response.getLivability());
        assertEquals(0.0, response.getMeasurement());
        assertEquals("none", response.getCalculationBase()); // Even though the type doesn't exist, we should still have it

        verify(polygonService, times(1)).getPolygonById(polygonId);
        verify(buildingTypeService, never()).getBuildingTypeByTypeId(anyString());
    }

    @Test
    void testCalculatePolygonData_BuildingTypeNotFound_ReturnsZeros() {
        // Test that checks what happens when we don't give a type at all
        // In the backend this should all return 0
        // In the frontend there's a different behavior, that falls back to a default type

        // Arrange
        Long polygonId = 1L;
        Double area = 100.0;
        Double volume = 1000.0;

        when(polygonService.getPolygonById(polygonId)).thenReturn(testPolygon);
        when(buildingTypeService.getBuildingTypeByTypeId("apartment"))
                .thenReturn(Optional.empty());

        // Act
        PolygonDataResponse response = polygonDataService.calculatePolygonData(polygonId, area, volume);

        // Assert
        assertNotNull(response);
        assertEquals(0.0, response.getCost());
        assertEquals(0.0, response.getIncome());
        assertEquals(0.0, response.getPeople());
        assertEquals(0.0, response.getLivability());
        assertEquals(0.0, response.getMeasurement());
        assertEquals("unknown", response.getCalculationBase());
    }

    @Test
    void testCalculatePolygonData_VolumeBasedButNoVolume_FallsBackToArea() {
        // Test where we ask for volume, but only have area. Should fall back and return area

        // Arrange
        Long polygonId = 1L;
        Double area = 100.0;
        Double volume = null;  // No volume provided

        when(polygonService.getPolygonById(polygonId)).thenReturn(testPolygon);
        when(buildingTypeService.getBuildingTypeByTypeId("apartment"))
                .thenReturn(Optional.of(testBuildingType));

        // Act
        PolygonDataResponse response = polygonDataService.calculatePolygonData(polygonId, area, volume);

        // Assert
        assertNotNull(response);
        assertEquals(30000.0, response.getCost());         // 300 * 100 (falls back to area)
        assertEquals(3600.0, response.getIncome());        // 30000 * 0.12
        assertEquals(0.6, response.getPeople());           // 0.006 * 100
        assertEquals(5.0, response.getLivability());
        assertEquals(100.0, response.getMeasurement());
        assertEquals("area", response.getCalculationBase()); // Should fall back to area
    }

    @Test
    void testCalculatePolygonData_CommercialBuilding_WorkersCalculation() {
        // Test that checks default behavior but with a different type
        // Perhaps this is redundant, but checks with slightly different values than the earlier test

        // Arrange
        Long polygonId = 1L;
        Double area = 50.0;
        Double volume = 500.0;

        BuildingType commercialType = new BuildingType();
        commercialType.setTypeId("commercial building");
        commercialType.setCost(200.0);      // €200 per m³
        commercialType.setIncome(15.0);     // 15% income
        commercialType.setPeople(0.018);    // 0.018 workers per m³
        commercialType.setLivability(2.0);  // Low livability
        commercialType.setCalculationBase("volume");

        testPolygon.setBuildingType("commercial building");

        when(polygonService.getPolygonById(polygonId)).thenReturn(testPolygon);
        when(buildingTypeService.getBuildingTypeByTypeId("commercial building"))
                .thenReturn(Optional.of(commercialType));

        // Act
        PolygonDataResponse response = polygonDataService.calculatePolygonData(polygonId, area, volume);

        // Assert
        assertNotNull(response);
        assertEquals(100000.0, response.getCost());        // 200 * 500
        assertEquals(15000.0, response.getIncome());       // 100000 * 0.15
        assertEquals(9.0, response.getPeople());           // 0.018 * 500 workers
        assertEquals(2.0, response.getLivability());
        assertEquals(500.0, response.getMeasurement());
        assertEquals("volume", response.getCalculationBase());
    }
}