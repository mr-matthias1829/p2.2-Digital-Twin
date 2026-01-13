package com.digitaltwin.spoordok;

import com.controller.Controller;
import com.dto.CalculationRequest;
import com.dto.CalculationResponse;
import com.dto.OccupationRequest;
import com.dto.OccupationResponse;
import com.dto.GoalCheckResponse;
import com.dto.PolygonDataResponse;
import com.model.BuildingType;
import com.model.Coordinate;
import com.model.Goal;
import com.model.Model;
import com.model.Polygon;
import com.service.BuildingTypeService;
import com.service.CalculationService;
import com.service.GoalService;
import com.service.ModelService;
import com.service.PolygonService;
import com.service.PolygonDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ControllerTest {

    @Mock
    private PolygonService polygonService;

    @Mock
    private ModelService modelService;

    @Mock
    private CalculationService calculationService;

    @Mock
    private BuildingTypeService buildingTypeService;

    @Mock
    private PolygonDataService polygonDataService;

    @Mock
    private GoalService goalService;

    @InjectMocks
    private Controller controller;

    private Polygon testPolygon;
    private Model testModel;
    private BuildingType testBuildingType;
    private Goal testGoal;

    /**
     * The tests in this file aren't super effective and kind of redundant
     * Effectively, controller only ever uses other classes and consists of getters/setters
     *
     * We're still testing it though, since if the controller misbehaves, the communication with
     * the frontend might be screwed up.
     *
     * Naming all the tests would be handy, but there's quite a few effectively doing the same but
     * for different methods. These include:
     * 1. trying to fetch all
     * 2. trying to fetch by id
     * 3. trying to fetch by invalid id
     * 4. trying to save
     * 5. trying to update
     * 6. trying to delete
     * 7. throwing an exception during a operation
     */

    @BeforeEach
    void setUp() {
        // Setup test polygon
        testPolygon = new Polygon();
        testPolygon.setId(1L);
        testPolygon.setName("Test Polygon");
        testPolygon.setHeight(10.0);
        testPolygon.setHasNatureOnTop(false);
        testPolygon.setCoordinates(new ArrayList<>());

        // Setup test model
        testModel = new Model();
        testModel.setId(1L);

        // Setup test building type
        testBuildingType = new BuildingType();
        testBuildingType.setId(1L);
        testBuildingType.setTypeId("apartment");
        testBuildingType.setCalculationBase("volume");

        // Setup test goal
        testGoal = new Goal();
        testGoal.setId(1L);
        testGoal.setGoalId("nature_min");
        testGoal.setEnabled(true);
    }

    @Test
    void testGetAllData_Success() {
        // Testing if we can successfully fetch all data at once

        // Arrange
        List<Polygon> polygons = Arrays.asList(testPolygon);
        List<Model> models = Arrays.asList(testModel);

        when(polygonService.getAllPolygons()).thenReturn(polygons);
        when(modelService.getAllModels()).thenReturn(models);

        // Act
        ResponseEntity<Map<String, Object>> response = controller.getAllData();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(polygons, response.getBody().get("polygons"));
        assertEquals(models, response.getBody().get("models"));
        verify(polygonService).getAllPolygons();
        verify(modelService).getAllModels();
    }

    // ========== POLYGON ENDPOINTS ==========

    @Test
    void testGetPolygonById_Found() {
        // Testing if we can get a single polygon by id

        // Arrange
        when(polygonService.getPolygonById(1L)).thenReturn(testPolygon);

        // Act
        ResponseEntity<Polygon> response = controller.getPolygonById(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(testPolygon, response.getBody());
        verify(polygonService).getPolygonById(1L);
    }

    @Test
    void testGetPolygonById_NotFound() {
        // Testing getting a polygon by a invalid id

        // Arrange
        when(polygonService.getPolygonById(999L)).thenReturn(null);

        // Act
        ResponseEntity<Polygon> response = controller.getPolygonById(999L);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode()); // Expect a no found because the page doesn't exist for the id
        verify(polygonService).getPolygonById(999L);
    }

    @Test
    void testCreatePolygon_Success() {
        // Testing if we can simply make a new polygon
        // ... This basically just tries to save it. Real creation goes through frontend

        // Arrange
        Polygon newPolygon = new Polygon();
        newPolygon.setHeight(5.0);
        newPolygon.setCoordinates(new ArrayList<>());

        when(polygonService.savePolygon(any(Polygon.class))).thenReturn(testPolygon);

        // Act
        ResponseEntity<Polygon> response = controller.createPolygon(newPolygon);

        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(polygonService).savePolygon(any(Polygon.class));
    }

    @Test
    void testCreatePolygon_WithoutHeight_DefaultsToZero() {
        // Create a polygon again, but check if it defaults height

        // Arrange
        Polygon newPolygon = new Polygon();
        newPolygon.setCoordinates(new ArrayList<>());

        when(polygonService.savePolygon(any(Polygon.class))).thenReturn(testPolygon);

        // Act
        ResponseEntity<Polygon> response = controller.createPolygon(newPolygon);

        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(0.0, newPolygon.getHeight());
    }

    @Test
    void testCreatePolygon_WithCoordinates_SetsBidirectionalRelationship() {
        // Yet again create a polygon, but this time checking for relations between saved coords

        // Arrange
        Polygon newPolygon = new Polygon();
        Coordinate coord = new Coordinate();
        newPolygon.setCoordinates(Arrays.asList(coord));

        when(polygonService.savePolygon(any(Polygon.class))).thenReturn(testPolygon);

        // Act
        controller.createPolygon(newPolygon);

        // Assert
        assertEquals(newPolygon, coord.getPolygon());
    }

    @Test
    void testCreatePolygon_Exception_ReturnsInternalServerError() {
        // Create a polygon but see what happens when we have a DB error

        // Arrange
        Polygon newPolygon = new Polygon();
        when(polygonService.savePolygon(any(Polygon.class))).thenThrow(new RuntimeException("DB error"));

        // Act
        ResponseEntity<Polygon> response = controller.createPolygon(newPolygon);

        // Assert
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
    }

    @Test
    void testUpdatePolygon_Success() {
        // Try updating a polygon

        // Arrange
        Polygon updatedPolygon = new Polygon();
        updatedPolygon.setHeight(15.0);
        updatedPolygon.setName("Updated");
        updatedPolygon.setHasNatureOnTop(true);
        updatedPolygon.setCoordinates(new ArrayList<>());

        when(polygonService.getPolygonById(1L)).thenReturn(testPolygon);
        when(polygonService.savePolygon(any(Polygon.class))).thenReturn(testPolygon);

        // Act
        ResponseEntity<Polygon> response = controller.updatePolygon(1L, updatedPolygon);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(polygonService).getPolygonById(1L);
        verify(polygonService).savePolygon(any(Polygon.class));
    }

    @Test
    void testUpdatePolygon_NotFound() {
        // Try to update a polygon, except we do not send the updated polygon

        // Arrange
        when(polygonService.getPolygonById(999L)).thenReturn(null);

        // Act
        ResponseEntity<Polygon> response = controller.updatePolygon(999L, testPolygon);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(polygonService).getPolygonById(999L);
        verify(polygonService, never()).savePolygon(any());
    }

    @Test
    void testUpdatePolygon_Exception_ReturnsInternalServerError() {
        // Try to update a polygon, except see what happens when we have a runtime error

        // Arrange
        when(polygonService.getPolygonById(1L)).thenReturn(testPolygon);
        when(polygonService.savePolygon(any())).thenThrow(new RuntimeException("Update failed"));

        // Act
        ResponseEntity<Polygon> response = controller.updatePolygon(1L, testPolygon);

        // Assert
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
    }

    @Test
    void testDeletePolygon_Success() {
        // Simply attempt to delete a polygon

        // Arrange
        doNothing().when(polygonService).deletePolygon(1L);

        // Act
        ResponseEntity<Void> response = controller.deletePolygon(1L);

        // Assert
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(polygonService).deletePolygon(1L);
    }

    @Test
    void testDeleteAllPolygons_Success() {
        // Try to delete all polygons

        // Arrange
        doNothing().when(polygonService).deleteAllPolygons();

        // Act
        ResponseEntity<Void> response = controller.deleteAllPolygons();

        // Assert
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(polygonService).deleteAllPolygons();
    }

    // ========== BUILDING TYPE ENDPOINTS ==========

    @Test
    void testGetAllBuildingTypes_Success() {
        // Test if we can get all types
        // Unlike GetAllModels or GetAllPolygons, this isn't included in GetAllData
        // Simply means that we should test this like this

        // Arrange
        List<BuildingType> types = Arrays.asList(testBuildingType);
        when(buildingTypeService.getAllBuildingTypes()).thenReturn(types);

        // Act
        ResponseEntity<List<BuildingType>> response = controller.getAllBuildingTypes();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(types, response.getBody());
    }

    @Test
    void testGetBuildingTypeById_Found() {
        // Get type by id

        // Arrange
        when(buildingTypeService.getBuildingTypeById(1L)).thenReturn(Optional.of(testBuildingType));

        // Act
        ResponseEntity<BuildingType> response = controller.getBuildingTypeById(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(testBuildingType, response.getBody());
    }

    @Test
    void testGetBuildingTypeById_NotFound() {
        // Get type by id except id doesn't exist

        // Arrange
        when(buildingTypeService.getBuildingTypeById(999L)).thenReturn(Optional.empty());

        // Act
        ResponseEntity<BuildingType> response = controller.getBuildingTypeById(999L);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void testGetBuildingTypeByTypeId_Found() {
        // Get type by using the string id

        // Arrange
        when(buildingTypeService.getBuildingTypeByTypeId("apartment")).thenReturn(Optional.of(testBuildingType));

        // Act
        ResponseEntity<BuildingType> response = controller.getBuildingTypeByTypeId("apartment");

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(testBuildingType, response.getBody());
    }

    @Test
    void testCreateBuildingType_Success() {
        // Try to create a new type

        // Arrange
        when(buildingTypeService.saveBuildingType(any())).thenReturn(testBuildingType);

        // Act
        ResponseEntity<BuildingType> response = controller.createBuildingType(testBuildingType);

        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(testBuildingType, response.getBody());
    }

    @Test
    void testDeleteBuildingType_Success() {
        // Try to delete a type

        // Arrange
        doNothing().when(buildingTypeService).deleteBuildingType(1L);

        // Act
        ResponseEntity<Void> response = controller.deleteBuildingType(1L);

        // Assert
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(buildingTypeService).deleteBuildingType(1L);
    }

    // ========== MODEL ENDPOINTS ==========

    @Test
    void testGetModelById_Found() {
        // Get model by id

        // Arrange
        when(modelService.getModelById(1L)).thenReturn(testModel);

        // Act
        ResponseEntity<Model> response = controller.getModelById(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(testModel, response.getBody());
    }

    @Test
    void testGetModelById_NotFound() {
        // Get model by non-existing id
        // If you read these comments so far, you'll notice how repetitive these tests are
        // so don't mind me simplifying them

        // Arrange
        when(modelService.getModelById(999L)).thenReturn(null);

        // Act
        ResponseEntity<Model> response = controller.getModelById(999L);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void testCreateModel_Success() {
        // Make a new model

        // Arrange
        when(modelService.saveModel(any())).thenReturn(testModel);

        // Act
        ResponseEntity<Model> response = controller.createModel(testModel);

        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(testModel, response.getBody());
    }

    @Test
    void testDeleteModel_Success() {
        // Delete a model

        // Arrange
        doNothing().when(modelService).deleteModel(1L);

        // Act
        ResponseEntity<Void> response = controller.deleteModel(1L);

        // Assert
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(modelService).deleteModel(1L);
    }

    @Test
    void testDeleteAllModels_Success() {
        // Delete all models

        // Arrange
        doNothing().when(modelService).deleteAllModels();

        // Act
        ResponseEntity<Void> response = controller.deleteAllModels();

        // Assert
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(modelService).deleteAllModels();
    }

    // ========== CALCULATION AND POLYGON DATA ENDPOINTS ==========

    /**
     * Following tests are a bit redundant since we already have proper tests for them in other testing files
     * We are simply just quickly double-checking here and see if they function from controller
     * If they do then that's enough since we only care if we can get the correct http status out of it
     *
     * If there's an issue check the related service class tests first!
     */
    @Test
    void testCalculateAreaAndVolume_Success() {
        // Try to calculate area and optionally volume if there's height

        // Arrange
        CalculationRequest request = new CalculationRequest(new ArrayList<>(), 10.0);
        CalculationResponse expectedResponse = new CalculationResponse(100.0, 1000.0, 10.0);

        when(calculationService.calculateAreaAndVolume(request)).thenReturn(expectedResponse);

        // Act
        ResponseEntity<CalculationResponse> response = controller.calculateAreaAndVolume(request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expectedResponse, response.getBody());
        verify(calculationService).calculateAreaAndVolume(request);
    }

    @Test
    void testCalculateOccupation_Success() {
        // Calc occupation from controller

        // Arrange
        OccupationRequest request = new OccupationRequest(new ArrayList<>(), new ArrayList<>());
        OccupationResponse expectedResponse = new OccupationResponse();

        when(calculationService.calculateOccupation(request)).thenReturn(expectedResponse);

        // Act
        ResponseEntity<OccupationResponse> response = controller.calculateOccupation(request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expectedResponse, response.getBody());
        verify(calculationService).calculateOccupation(request);
    }

    @Test
    void testCheckGoals_Success() {
        // Test goals

        // Arrange
        OccupationRequest request = new OccupationRequest(new ArrayList<>(), new ArrayList<>());
        GoalCheckResponse expectedResponse = new GoalCheckResponse();

        when(calculationService.checkGoals(request)).thenReturn(expectedResponse);

        // Act
        ResponseEntity<GoalCheckResponse> response = controller.checkGoals(request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expectedResponse, response.getBody());
        verify(calculationService).checkGoals(request);
    }

    @Test
    void testGetPolygonData_Success() {
        // Get data from a polygon

        // Arrange
        PolygonDataResponse expectedResponse = new PolygonDataResponse();
        when(polygonDataService.calculatePolygonData(1L, 100.0, 1000.0)).thenReturn(expectedResponse);

        // Act
        ResponseEntity<PolygonDataResponse> response = controller.getPolygonData(1L, 100.0, 1000.0);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expectedResponse, response.getBody());
        verify(polygonDataService).calculatePolygonData(1L, 100.0, 1000.0);
    }

    @Test
    void testGetPolygonData_WithoutParameters_Success() {
        // Get data from a polygon that's missing some properties. This should still return fine

        // Arrange
        PolygonDataResponse expectedResponse = new PolygonDataResponse();
        when(polygonDataService.calculatePolygonData(1L, null, null)).thenReturn(expectedResponse);

        // Act
        ResponseEntity<PolygonDataResponse> response = controller.getPolygonData(1L, null, null);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(polygonDataService).calculatePolygonData(1L, null, null);
    }

    @Test
    void testGetPolygonData_Exception_ReturnsInternalServerError() {
        // Get data from a polygon, this time though we throw an exception

        // Arrange
        when(polygonDataService.calculatePolygonData(anyLong(), any(), any()))
                .thenThrow(new RuntimeException("Calculation error"));

        // Act
        ResponseEntity<PolygonDataResponse> response = controller.getPolygonData(1L, 100.0, 1000.0);

        // Assert
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
    }

    // ========== GOAL CONFIG ENDPOINTS ==========

    @Test
    void testGetAllGoals_Success() {
        // Simply try to get all goals

        // Arrange
        List<Goal> goals = Arrays.asList(testGoal);
        when(goalService.getAllGoals()).thenReturn(goals);

        // Act
        ResponseEntity<List<Goal>> response = controller.getAllGoals();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(goals, response.getBody());
    }

    @Test
    void testGetGoalById_Found() {
        // Get a goal by id... easy enough

        // Arrange
        when(goalService.getGoalById(1L)).thenReturn(Optional.of(testGoal));

        // Act
        ResponseEntity<Goal> response = controller.getGoalById(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(testGoal, response.getBody());
    }

    @Test
    void testGetGoalById_NotFound() {
        // Get a goal by an invalid id

        // Arrange
        when(goalService.getGoalById(999L)).thenReturn(Optional.empty());

        // Act
        ResponseEntity<Goal> response = controller.getGoalById(999L);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void testGetGoalByGoalId_Found() {
        // Get a goal by the string id

        // Arrange
        when(goalService.getGoalByGoalId("nature_min")).thenReturn(Optional.of(testGoal));

        // Act
        ResponseEntity<Goal> response = controller.getGoalByGoalId("nature_min");

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(testGoal, response.getBody());
    }

    @Test
    void testCreateGoal_Success() {
        // Create a goal

        // Arrange
        when(goalService.saveGoal(any())).thenReturn(testGoal);

        // Act
        ResponseEntity<Goal> response = controller.createGoal(testGoal);

        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(testGoal, response.getBody());
    }

    @Test
    void testUpdateGoal_Success() {
        // Update a goal... man these comments are so useful for explaining a test!

        // Arrange
        Goal updatedGoal = new Goal();
        updatedGoal.setGoalId("updated_goal");

        when(goalService.getGoalById(1L)).thenReturn(Optional.of(testGoal));
        when(goalService.saveGoal(any())).thenReturn(updatedGoal);

        // Act
        ResponseEntity<Goal> response = controller.updateGoal(1L, updatedGoal);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(goalService).getGoalById(1L);
        verify(goalService).saveGoal(any());
    }

    @Test
    void testUpdateGoal_NotFound() {
        // Update a goal that has an id that doesn't exist
        // Arrange
        when(goalService.getGoalById(999L)).thenReturn(Optional.empty());

        // Act
        ResponseEntity<Goal> response = controller.updateGoal(999L, testGoal);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(goalService, never()).saveGoal(any());
    }

    @Test
    void testDeleteGoal_Success() {
        // Simply try to delete a goal

        // Arrange
        doNothing().when(goalService).deleteGoal(1L);

        // Act
        ResponseEntity<Void> response = controller.deleteGoal(1L);

        // Assert
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(goalService).deleteGoal(1L);
    }
}