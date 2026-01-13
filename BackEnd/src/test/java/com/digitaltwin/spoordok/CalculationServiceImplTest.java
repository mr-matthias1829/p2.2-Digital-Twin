package com.digitaltwin.spoordok;

import com.dto.CalculationRequest;
import com.dto.CalculationResponse;
import com.dto.OccupationRequest;
import com.dto.OccupationResponse;
import com.dto.GoalCheckResponse;
import com.model.BuildingType;
import com.model.Goal;
import com.service.BuildingTypeService;
import com.service.CalculationServiceImpl;
import com.service.GoalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CalculationServiceImplTest {

    @Mock
    private BuildingTypeService buildingTypeService;

    @Mock
    private GoalService goalService;

    @InjectMocks
    private CalculationServiceImpl calculationService;

    private BuildingType apartmentType;
    private BuildingType commercialType;
    private BuildingType natureType;

    /**
     * Testing for the CalculationService:
     * 1. default expected behavior for area with cartesian (production values)
     * 2. default expected behavior for area with local (which are used by all tests below)
     * 3. asking for volume with no height
     * 4. asking for area with only 2 points
     * 5. asking for area with no points
     * 6. default expected behavior for occupation stats using 1 polygon
     * 7. default expected behavior for a polygon outside spoordok
     * 8. expected behavior for a polygon with nature on a roof set to true
     * 9. default expected behavior for occupation stats using 2 polygons
     * 8. expected behavior when spoordok doesn't exist
     * 9. testing nature goal
     * 10. testing population goal
     * 11. testing commercial goal
     * 12. testing disabled goal
     * 13. testing worker goal
     */
    @BeforeEach
    void setUp() {
        // Setup building types
        apartmentType = new BuildingType();
        apartmentType.setTypeId("apartment");
        apartmentType.setCost(300.0);
        apartmentType.setIncome(12.0);
        apartmentType.setPeople(0.006);
        apartmentType.setLivability(5.0);
        apartmentType.setCalculationBase("volume");

        commercialType = new BuildingType();
        commercialType.setTypeId("commercial building");
        commercialType.setCost(200.0);
        commercialType.setIncome(15.0);
        commercialType.setPeople(0.018);
        commercialType.setLivability(2.0);
        commercialType.setCalculationBase("volume");

        natureType = new BuildingType();
        natureType.setTypeId("nature");
        natureType.setCost(150.0);
        natureType.setIncome(0.0);
        natureType.setPeople(0.0);
        natureType.setLivability(10.0);
        natureType.setCalculationBase("area");
    }

    @Test
    void testCalculateAreaAndVolume_SimpleSquare_CartesianCoords_Success() {
        // Test a simple 10x10 meter square (100 m²) using realistic coordinates (which will be used in production)

        // Arrange
        double baseX = 4_000_000;
        double baseY = 3_000_000;
        double baseZ = 5_000_000;

        List<CalculationRequest.Position> positions = Arrays.asList(
                new CalculationRequest.Position(baseX, baseY, baseZ),
                new CalculationRequest.Position(baseX + 10, baseY, baseZ),
                new CalculationRequest.Position(baseX + 10, baseY + 10, baseZ),
                new CalculationRequest.Position(baseX, baseY + 10, baseZ)
        );

        CalculationRequest request = new CalculationRequest(positions, 5.0);

        // Act
        CalculationResponse response = calculationService.calculateAreaAndVolume(request);

        // Assert
        assertNotNull(response);
        System.out.println(response.getArea());
        assertTrue(response.getArea() > 0, "Area should be positive");
        assertNotNull(response.getVolume());
        assertEquals(5.0, response.getHeight());
        // Volume should be approximately area * height
        assertEquals(response.getArea() * 5.0, response.getVolume(), 0.01);
    }

    @Test
    void testCalculateAreaAndVolume_SimpleSquare_LocalCoords_Success() {
        // Test a simple 10x10 meter square (100 m²) using local coordinates (used for testing from this test on out)

        // Arrange
        List<CalculationRequest.Position> positions = Arrays.asList(
                new CalculationRequest.Position(0, 0, 0),
                new CalculationRequest.Position(10, 0, 0),
                new CalculationRequest.Position(10, 10, 0),
                new CalculationRequest.Position(0, 10, 0)
        );

        CalculationRequest request = new CalculationRequest(positions, 5.0);

        // Act
        CalculationResponse response = calculationService.calculateAreaAndVolume(request);

        // Assert
        assertNotNull(response);
        System.out.println(response.getArea());
        assertTrue(response.getArea() > 0, "Area should be positive");
        assertNotNull(response.getVolume());
        assertEquals(5.0, response.getHeight());
        // Volume should be approximately area * height
        assertEquals(response.getArea() * 5.0, response.getVolume(), 0.01);
    }

     /**
      * From the previous test (2nd test) on out, we are going to use the local coordinates instead of real Cartesian-scale
      * This will make testing slightly more bearable
      *
      * And while the area output from sending local coords is inaccurate,
      * at least something is returned which is good enough in the testing cases
      *
      * For production, ALWAYS use proper cartesian coords
     */

    @Test
    void testCalculateAreaAndVolume_WithoutHeight_NoVolume() {
        // Test that volume is null when no height is provided

        // Arrange
        List<CalculationRequest.Position> positions = Arrays.asList(
                new CalculationRequest.Position(0, 0, 0),
                new CalculationRequest.Position(10, 0, 0),
                new CalculationRequest.Position(10, 10, 0),
                new CalculationRequest.Position(0, 10, 0)
        );
        CalculationRequest request = new CalculationRequest(positions, null);

        // Act
        CalculationResponse response = calculationService.calculateAreaAndVolume(request);

        // Assert
        assertNotNull(response);
        assertTrue(response.getArea() > 0);
        assertNull(response.getVolume());
    }

    @Test
    void testCalculateAreaAndVolume_WithZeroHeight_NoVolume() {
        // Test that volume is null when height is zero

        // Arrange
        List<CalculationRequest.Position> positions = Arrays.asList(
                new CalculationRequest.Position(0, 0, 0),
                new CalculationRequest.Position(10, 0, 0),
                new CalculationRequest.Position(10, 10, 0)
        );
        CalculationRequest request = new CalculationRequest(positions, 0.0);

        // Act
        CalculationResponse response = calculationService.calculateAreaAndVolume(request);

        // Assert
        assertNotNull(response);
        assertNull(response.getVolume());
    }

    @Test
    void testCalculateAreaAndVolume_LessThanThreePoints_ReturnsZero() {
        // Test that area is zero when less than 3 points
        // This is because 2 points make a line, which can't return an area

        // Arrange
        List<CalculationRequest.Position> positions = Arrays.asList(
                new CalculationRequest.Position(0, 0, 0),
                new CalculationRequest.Position(10, 0, 0)
        );
        CalculationRequest request = new CalculationRequest(positions, 5.0);

        // Act
        CalculationResponse response = calculationService.calculateAreaAndVolume(request);

        // Assert
        assertNotNull(response);
        assertEquals(0.0, response.getArea());
        assertNull(response.getVolume());
    }

    @Test
    void testCalculateAreaAndVolume_NullPositions_ReturnsZero() {
        // Test null positions handling

        // Arrange
        CalculationRequest request = new CalculationRequest(null, 5.0);

        // Act
        CalculationResponse response = calculationService.calculateAreaAndVolume(request);

        // Assert
        assertNotNull(response);
        assertEquals(0.0, response.getArea());
        assertNull(response.getVolume());
    }

    @Test
    void testCalculateOccupation_SinglePolygon_Success() {
        // Test occupation with one polygon inside Spoordok

        // Arrange
        List<CalculationRequest.Position> spoordokPositions = Arrays.asList(
                new CalculationRequest.Position(0, 0, 0),
                new CalculationRequest.Position(100, 0, 0),
                new CalculationRequest.Position(100, 100, 0),
                new CalculationRequest.Position(0, 100, 0)
        );

        List<CalculationRequest.Position> polygonPositions = Arrays.asList(
                new CalculationRequest.Position(10, 10, 0),
                new CalculationRequest.Position(20, 10, 0),
                new CalculationRequest.Position(20, 20, 0),
                new CalculationRequest.Position(10, 20, 0)
        );

        OccupationRequest.PolygonArea polygon = new OccupationRequest.PolygonArea(
                polygonPositions, "apartment", 10.0, false
        );

        OccupationRequest request = new OccupationRequest(
                spoordokPositions,
                Arrays.asList(polygon)
        );

        when(buildingTypeService.getBuildingTypeByTypeId("apartment"))
                .thenReturn(Optional.of(apartmentType));

        // Act
        OccupationResponse response = calculationService.calculateOccupation(request);

        // Assert
        assertNotNull(response);
        assertTrue(response.getSpoordokArea() > 0);
        assertTrue(response.getOccupiedArea() > 0);
        assertTrue(response.getOccupationPercentage() > 0);
        assertTrue(response.getOccupationPercentage() < 100); // Empty spoordok area is a % too

        // Check type breakdown
        assertNotNull(response.getTypeBreakdown());
        assertTrue(response.getTypeBreakdown().containsKey("apartment"));
        assertTrue(response.getTypeBreakdown().containsKey("unoccupied"));

        // Check people calculation
        OccupationResponse.TypeOccupation apartmentOccupation =
                response.getTypeBreakdown().get("apartment");
        assertTrue(apartmentOccupation.getPeople() > 0); // This relies on the fact that the type has a people value higher than 0
    }

    @Test
    void testCalculateOccupation_PolygonOutsideSpoordok_NotCounted() {
        // Test that polygon outside Spoordok is not counted

        // Arrange
        List<CalculationRequest.Position> spoordokPositions = Arrays.asList(
                new CalculationRequest.Position(0, 0, 0),
                new CalculationRequest.Position(50, 0, 0),
                new CalculationRequest.Position(50, 50, 0),
                new CalculationRequest.Position(0, 50, 0)
        );

        // Polygon completely outside Spoordok
        List<CalculationRequest.Position> polygonPositions = Arrays.asList(
                new CalculationRequest.Position(60, 60, 0),
                new CalculationRequest.Position(70, 60, 0),
                new CalculationRequest.Position(70, 70, 0),
                new CalculationRequest.Position(60, 70, 0)
        );

        OccupationRequest.PolygonArea polygon = new OccupationRequest.PolygonArea(
                polygonPositions, "apartment", 10.0, false
        );

        OccupationRequest request = new OccupationRequest(
                spoordokPositions,
                Arrays.asList(polygon)
        );

        // Act
        OccupationResponse response = calculationService.calculateOccupation(request);

        // Assert
        assertNotNull(response);
        assertEquals(0.0, response.getOccupiedArea());
        assertEquals(0.0, response.getOccupationPercentage());

        // Should only have unoccupied area
        assertEquals(response.getSpoordokArea(),
                response.getTypeBreakdown().get("unoccupied").getArea(), 0.01);
    }

    @Test
    void testCalculateOccupation_NatureOnTop_CountedInNature() {
        // Test that nature on top is added to nature type

        // Arrange
        List<CalculationRequest.Position> spoordokPositions = Arrays.asList(
                new CalculationRequest.Position(0, 0, 0),
                new CalculationRequest.Position(100, 0, 0),
                new CalculationRequest.Position(100, 100, 0),
                new CalculationRequest.Position(0, 100, 0)
        );

        List<CalculationRequest.Position> buildingPositions = Arrays.asList(
                new CalculationRequest.Position(10, 10, 0),
                new CalculationRequest.Position(20, 10, 0),
                new CalculationRequest.Position(20, 20, 0),
                new CalculationRequest.Position(10, 20, 0)
        );

        // Building with nature on top
        OccupationRequest.PolygonArea building = new OccupationRequest.PolygonArea(
                buildingPositions, "apartment", 10.0, true  // hasNatureOnTop = true
        );

        OccupationRequest request = new OccupationRequest(
                spoordokPositions,
                Arrays.asList(building)
        );

        when(buildingTypeService.getBuildingTypeByTypeId("apartment"))
                .thenReturn(Optional.of(apartmentType));

        // Act
        OccupationResponse response = calculationService.calculateOccupation(request);

        // Assert
        assertNotNull(response);
        assertTrue(response.getTypeBreakdown().containsKey("nature"));

        // Nature area should equal building footprint (green roof)
        OccupationResponse.TypeOccupation natureOccupation =
                response.getTypeBreakdown().get("nature");
        assertTrue(natureOccupation.getArea() > 0);
    }

    @Test
    void testCalculateOccupation_MultiplePolygonTypes_Success() {
        // Test with multiple building types
        // Effectively just the default behavior but we send over 2 polygons at once instead of 1

        // Arrange
        List<CalculationRequest.Position> spoordokPositions = Arrays.asList(
                new CalculationRequest.Position(0, 0, 0),
                new CalculationRequest.Position(100, 0, 0),
                new CalculationRequest.Position(100, 100, 0),
                new CalculationRequest.Position(0, 100, 0)
        );

        // Apartment building
        List<CalculationRequest.Position> apartment1 = Arrays.asList(
                new CalculationRequest.Position(10, 10, 0),
                new CalculationRequest.Position(20, 10, 0),
                new CalculationRequest.Position(20, 20, 0),
                new CalculationRequest.Position(10, 20, 0)
        );

        // Commercial building
        List<CalculationRequest.Position> commercial1 = Arrays.asList(
                new CalculationRequest.Position(30, 30, 0),
                new CalculationRequest.Position(40, 30, 0),
                new CalculationRequest.Position(40, 40, 0),
                new CalculationRequest.Position(30, 40, 0)
        );

        List<OccupationRequest.PolygonArea> polygons = Arrays.asList(
                new OccupationRequest.PolygonArea(apartment1, "apartment", 10.0, false),
                new OccupationRequest.PolygonArea(commercial1, "commercial building", 15.0, false)
        );

        OccupationRequest request = new OccupationRequest(spoordokPositions, polygons);

        when(buildingTypeService.getBuildingTypeByTypeId("apartment"))
                .thenReturn(Optional.of(apartmentType));
        when(buildingTypeService.getBuildingTypeByTypeId("commercial building"))
                .thenReturn(Optional.of(commercialType));

        // Act
        OccupationResponse response = calculationService.calculateOccupation(request);

        // Assert
        assertNotNull(response);
        assertTrue(response.getTypeBreakdown().containsKey("apartment"));
        assertTrue(response.getTypeBreakdown().containsKey("commercial building"));

        // Check that people are calculated for both types
        assertTrue(response.getTypeBreakdown().get("apartment").getPeople() > 0);
        assertTrue(response.getTypeBreakdown().get("commercial building").getPeople() > 0);
    }

    @Test
    void testCalculateOccupation_ZeroSpoordokArea_ReturnsZero() {
        // Test with invalid Spoordok (no area)

        // Arrange
        List<CalculationRequest.Position> spoordokPositions = Arrays.asList(
                new CalculationRequest.Position(0, 0, 0)
        );

        OccupationRequest request = new OccupationRequest(spoordokPositions, new ArrayList<>());

        // Act
        OccupationResponse response = calculationService.calculateOccupation(request);

        // Assert
        assertNotNull(response);
        assertEquals(0.0, response.getSpoordokArea());
        assertEquals(0.0, response.getOccupiedArea());
        assertEquals(0.0, response.getOccupationPercentage());
    }


    @Test
    void testCheckGoals_NatureGoal_Achieved() {
        // Test nature percentage goal is achieved

        // Arrange
        List<CalculationRequest.Position> spoordokPositions = Arrays.asList(
                new CalculationRequest.Position(0, 0, 0),
                new CalculationRequest.Position(100, 0, 0),
                new CalculationRequest.Position(100, 100, 0),
                new CalculationRequest.Position(0, 100, 0)
        );

        // 25% of area is nature (2500 m² out of 10000 m²)
        List<CalculationRequest.Position> naturePositions = Arrays.asList(
                new CalculationRequest.Position(0, 0, 0),
                new CalculationRequest.Position(50, 0, 0),
                new CalculationRequest.Position(50, 50, 0),
                new CalculationRequest.Position(0, 50, 0)
        );

        OccupationRequest.PolygonArea naturePoly = new OccupationRequest.PolygonArea(
                naturePositions, "nature", 0.0, false
        );

        OccupationRequest request = new OccupationRequest(
                spoordokPositions,
                Arrays.asList(naturePoly)
        );

        Goal natureGoal = new Goal(
                "nature_min",
                "Minimum 20% nature",
                20.0,
                "min",
                "nature_percentage"
        );
        natureGoal.setEnabled(true);

        when(goalService.getAllGoals()).thenReturn(Arrays.asList(natureGoal));
        when(buildingTypeService.getBuildingTypeByTypeId("nature"))
                .thenReturn(Optional.of(natureType));

        // Act
        GoalCheckResponse response = calculationService.checkGoals(request);

        // Assert
        assertNotNull(response);
        assertFalse(response.getGoals().isEmpty());

        GoalCheckResponse.Goal checkedGoal = response.getGoals().get(0);
        assertEquals("nature_min", checkedGoal.getId());
        assertTrue(checkedGoal.isAchieved(), "Nature goal should be achieved (25% >= 20%)");
        assertTrue(checkedGoal.getCurrentValue() >= 20.0);
    }

    @Test
    void testCheckGoals_ResidentsGoal_NotAchieved() {
        // Test residents goal is not achieved

        // Arrange
        List<CalculationRequest.Position> spoordokPositions = Arrays.asList(
                new CalculationRequest.Position(0, 0, 0),
                new CalculationRequest.Position(100, 0, 0),
                new CalculationRequest.Position(100, 100, 0),
                new CalculationRequest.Position(0, 100, 0)
        );

        // Small apartment with few residents
        List<CalculationRequest.Position> apartmentPositions = Arrays.asList(
                new CalculationRequest.Position(10, 10, 0),
                new CalculationRequest.Position(20, 10, 0),
                new CalculationRequest.Position(20, 20, 0),
                new CalculationRequest.Position(10, 20, 0)
        );

        OccupationRequest.PolygonArea apartment = new OccupationRequest.PolygonArea(
                apartmentPositions, "apartment", 10.0, false
        );

        OccupationRequest request = new OccupationRequest(
                spoordokPositions,
                Arrays.asList(apartment)
        );

        Goal residentsGoal = new Goal(
                "residents_min",
                "Minimum 3000 residents",
                3000.0,
                "min",
                "residents_count"
        );
        residentsGoal.setEnabled(true);

        when(goalService.getAllGoals()).thenReturn(Arrays.asList(residentsGoal));
        when(buildingTypeService.getBuildingTypeByTypeId("apartment"))
                .thenReturn(Optional.of(apartmentType));

        // Act
        GoalCheckResponse response = calculationService.checkGoals(request);

        // Assert
        assertNotNull(response);
        GoalCheckResponse.Goal checkedGoal = response.getGoals().get(0);
        assertEquals("residents_min", checkedGoal.getId());
        assertFalse(checkedGoal.isAchieved(), "Residents goal should not be achieved");
        assertTrue(checkedGoal.getCurrentValue() < 3000.0);
    }

    @Test
    void testCheckGoals_CommercialMaxGoal_Success() {
        // Test commercial percentage maximum goal

        // Arrange
        List<CalculationRequest.Position> spoordokPositions = Arrays.asList(
                new CalculationRequest.Position(0, 0, 0),
                new CalculationRequest.Position(100, 0, 0),
                new CalculationRequest.Position(100, 100, 0),
                new CalculationRequest.Position(0, 100, 0)
        );

        // Small commercial building (10% of buildings)
        List<CalculationRequest.Position> commercial = Arrays.asList(
                new CalculationRequest.Position(10, 10, 0),
                new CalculationRequest.Position(20, 10, 0),
                new CalculationRequest.Position(20, 20, 0),
                new CalculationRequest.Position(10, 20, 0)
        );

        // Larger apartment (90% of buildings)
        List<CalculationRequest.Position> apartment = Arrays.asList(
                new CalculationRequest.Position(30, 30, 0),
                new CalculationRequest.Position(60, 30, 0),
                new CalculationRequest.Position(60, 60, 0),
                new CalculationRequest.Position(30, 60, 0)
        );

        List<OccupationRequest.PolygonArea> polygons = Arrays.asList(
                new OccupationRequest.PolygonArea(commercial, "commercial building", 10.0, false),
                new OccupationRequest.PolygonArea(apartment, "apartment", 10.0, false)
        );

        OccupationRequest request = new OccupationRequest(spoordokPositions, polygons);

        Goal commercialGoal = new Goal(
                "commercial_max",
                "Maximum 20% commercial",
                20.0,
                "max",
                "commercial_percentage"
        );
        commercialGoal.setEnabled(true);

        when(goalService.getAllGoals()).thenReturn(Arrays.asList(commercialGoal));
        when(buildingTypeService.getBuildingTypeByTypeId("commercial building"))
                .thenReturn(Optional.of(commercialType));
        when(buildingTypeService.getBuildingTypeByTypeId("apartment"))
                .thenReturn(Optional.of(apartmentType));

        // Act
        GoalCheckResponse response = calculationService.checkGoals(request);

        // Assert
        assertNotNull(response);
        GoalCheckResponse.Goal checkedGoal = response.getGoals().get(0);
        assertEquals("commercial_max", checkedGoal.getId());
        assertTrue(checkedGoal.isAchieved(), "Commercial % should be under 20%");
    }

    @Test
    void testCheckGoals_DisabledGoal_Skipped() {
        // Test that disabled goals are not checked

        // Arrange
        List<CalculationRequest.Position> spoordokPositions = Arrays.asList(
                new CalculationRequest.Position(0, 0, 0),
                new CalculationRequest.Position(100, 0, 0),
                new CalculationRequest.Position(100, 100, 0),
                new CalculationRequest.Position(0, 100, 0)
        );

        OccupationRequest request = new OccupationRequest(spoordokPositions, new ArrayList<>());

        Goal disabledGoal = new Goal(
                "test_goal",
                "Test goal",
                100.0,
                "min",
                "nature_percentage"
        );
        disabledGoal.setEnabled(false);  // Disabled

        when(goalService.getAllGoals()).thenReturn(Arrays.asList(disabledGoal));

        // Act
        GoalCheckResponse response = calculationService.checkGoals(request);

        // Assert
        assertNotNull(response);
        assertTrue(response.getGoals().isEmpty(), "Disabled goals should be skipped");
    }

    @Test
    void testCheckGoals_WorkersCount_Success() {
        // Test workers count goal

        // Arrange
        List<CalculationRequest.Position> spoordokPositions = Arrays.asList(
                new CalculationRequest.Position(0, 0, 0),
                new CalculationRequest.Position(100, 0, 0),
                new CalculationRequest.Position(100, 100, 0),
                new CalculationRequest.Position(0, 100, 0)
        );

        // Large commercial building with workers
        List<CalculationRequest.Position> commercial = Arrays.asList(
                new CalculationRequest.Position(10, 10, 0),
                new CalculationRequest.Position(60, 10, 0),
                new CalculationRequest.Position(60, 60, 0),
                new CalculationRequest.Position(10, 60, 0)
        );

        OccupationRequest.PolygonArea commercialPoly = new OccupationRequest.PolygonArea(
                commercial, "commercial building", 20.0, false
        );

        OccupationRequest request = new OccupationRequest(
                spoordokPositions,
                Arrays.asList(commercialPoly)
        );

        Goal workersGoal = new Goal(
                "workers_min",
                "Minimum 500 workers",
                500.0,
                "min",
                "workers_count"
        );
        workersGoal.setEnabled(true);

        when(goalService.getAllGoals()).thenReturn(Arrays.asList(workersGoal));
        when(buildingTypeService.getBuildingTypeByTypeId("commercial building"))
                .thenReturn(Optional.of(commercialType));

        // Act
        GoalCheckResponse response = calculationService.checkGoals(request);

        // Assert
        assertNotNull(response);
        GoalCheckResponse.Goal checkedGoal = response.getGoals().get(0);
        assertEquals("workers_min", checkedGoal.getId());
        // With 2500 m² * 20m height = 50000 m³ * 0.018 people/m³ = 900 workers
        // This is of course, assuming that the type has a people value of 0.018
        // Expected result might need to be adjusted if that value changes
        assertTrue(checkedGoal.getCurrentValue() > 500.0);
        assertTrue(checkedGoal.isAchieved());
    }
}