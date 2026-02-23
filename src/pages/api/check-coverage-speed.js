// api/check-coverage-speed.js
/*
Version 3 - Coverage map generation API. 
This mode gets the elevations of the external sectors of the grid and reuses them for the internal sectors.
*/

import { calculateDistance, calculateIntermediatePoints, getElevationsGrouped, calculate_occupation_percentage } from './process-json';
import config from './config.json';


const FULL_COMMUNICATION_PERCENTAGE = config.FULL_COMMUNICATION_PERCENTAGE;
const POOR_COMMUNICATION_PERCENTAGE = config.POOR_COMMUNICATION_PERCENTAGE;
const NO_COMMUNICATION_PERCENTAGE = config.NO_COMMUNICATION_PERCENTAGE;
const ASSURED_COMMUNICATION_RADIUS = config.ASSURED_COMMUNICATION_RADIUS;

const FULL_COMMUNICATION_COLOR= config.FULL_COMMUNICATION_COLOR;
const POOR_COMMUNICATION_COLOR = config.POOR_COMMUNICATION_COLOR;
const NO_COMMUNICATION_COLOR = config.NO_COMMUNICATION_COLOR;
const NULL_COMMUNICATION_COLOR = config.NULL_COMMUNICATION_COLOR;

const MID_GRID_SIZE = config.MID_GRID_SIZE;
const LARGE_GRID_SIZE = config.LARGE_GRID_SIZE;

const SMALL_SIZE_DIVISOR = config.SMALL_SIZE_DIVISOR;
const MID_SIZE_DIVISOR = config.MID_SIZE_DIVISOR;
const LARGE_SIZE_DIVISOR = config.LARGE_SIZE_DIVISOR;

const GOOGLE_API_ID = config.GOOGLE_API_ID;
const BING_API_ID = config.BING_API_ID;


export default async function handler(req, res) {
    const sectors = [];  // Contain the coverage map sectors
    const gridElements = []; // Contain the grid elements

    if (req.method === 'POST') {
        try {
            const { gateway, gridSizeMeters, gridResolution, checkPointsGroundElevation, apiID, apiKeys, elevationPoints } = req.body;

            if (!gateway || !gridSizeMeters || !gridResolution || !checkPointsGroundElevation) {
                return res.status(400).json({ error: 'Missing elements on coverage map speed generation API' });
            }

            if (apiID === GOOGLE_API_ID && apiKeys.google === '') {
                return res.status(400).json({ error: 'Introduce a Google API key' });
            }

            if (apiID === BING_API_ID && apiKeys.bing === '') {
                return res.status(400).json({ error: 'Introduce a Bing API key' });
            }

            
            const halfGridSizeMeters = gridSizeMeters / 2;
            const centerLat = gateway.lat;
            const centerLng = gateway.lng;

            let sector_id = 0;
            
            // Generates sectors coordinates 
            const latDegreeResolution = metersToLatDegrees(gridResolution);
            const lngDegreeResolution = metersToLngDegrees(gridResolution, centerLat);

            for (let latOffset = -halfGridSizeMeters; latOffset < halfGridSizeMeters; latOffset += gridResolution) {
                const lat1 = centerLat + metersToLatDegrees(latOffset);  // Left top corner
                const lat2 = lat1 + latDegreeResolution;  // Right bottom corner
        
                for (let lngOffset = -halfGridSizeMeters; lngOffset < halfGridSizeMeters; lngOffset += gridResolution) {
                    const lng1 = centerLng + metersToLngDegrees(lngOffset, centerLat);  // Left top corner
                    const lng2 = lng1 + lngDegreeResolution;  // Right bottom corner
                
                    // Calculate the central point of the sector
                    const checkPoint = {
                        lat: (lat1 + lat2) / 2,
                        lng: (lng1 + lng2) / 2,
                        groundElevation: checkPointsGroundElevation
                    };

                    // Calculate the total distance between the checkPoint and the gateway
                    let totalDistance = calculateDistance(checkPoint.lat, checkPoint.lng, gateway.lat, gateway.lng);

                    // Calculate the intermediate points between the checkPoint and the gateway
                    const intermediatePoints = calculateIntermediatePoints(
                        { lat: checkPoint.lat, lng: checkPoint.lng },
                        { lat: gateway.lat, lng: gateway.lng },
                        elevationPoints
                    );
                    
                    // Add all generated data to the gridElements array
                    gridElements.push({
                        bounds: [
                            [lat1, lng1],  // Left top corner coordinates
                            [lat2, lng2]   // Right bottom corner coordinates
                        ],
                        center: checkPoint,  // Central point coordinates
                        color: '',
                        distances: [],
                        totalDistance: totalDistance,
                        groundElevation: checkPointsGroundElevation,
                        intermediatePoints: intermediatePoints,
                        elevations: [],
                        occupationLevel: -1,
                        gateway: gateway,
                        id: sector_id
                    });

                    sector_id++;
                }
            }

            // Define the limits of the grid
            let minLat = Infinity;
            let maxLat = -Infinity;
            let minLng = Infinity;
            let maxLng = -Infinity;

            for (const el of gridElements) {
            const [lat1, lng1] = el.bounds[0];
            const [lat2, lng2] = el.bounds[1];
            
            minLat = Math.min(minLat, lat1, lat2);
            maxLat = Math.max(maxLat, lat1, lat2);
            minLng = Math.min(minLng, lng1, lng2);
            maxLng = Math.max(maxLng, lng1, lng2);
}
            // Filter the external sectors
            const externalSectors = gridElements.filter(el => {
                const lat1 = el.bounds[0][0]; // Coordinate latitude of the upper left corner
                const lat2 = el.bounds[1][0]; // Coordinate latitude of the lower right corner
                const lng1 = el.bounds[0][1]; // Coordinate longitude of the upper left corner
                const lng2 = el.bounds[1][1]; // Coordinate longitude of the lower right corner

                // The sector is external if it is on the top, bottom, left or right edge of the grid
                return lat1 === minLat || lat2 === maxLat || lng1 === minLng || lng2 === maxLng;
            });
            
            // Join all intermediate elevations of the external sectors into a single array.
            const points = [];
            externalSectors.forEach(externalSector => {
                externalSector.intermediatePoints.forEach(intermediatePoint => {
                    const latLng = {lat: intermediatePoint.lat, lng: intermediatePoint.lng};
                    points.push(latLng);
                });
            });

            // Get the elevations of the external sectors intermediate points
            //const elevationsGrouped = await getElevationsGrouped(points, apiID, apiKeys);
            const batchSize = 50000; 
            const totalBatches = Math.ceil(points.length / batchSize);
            let elevationsGrouped = [];

            for (let i = 0; i < totalBatches; i++) {
                const batchPoints = points.slice(i * batchSize, (i + 1) * batchSize);
                const batchElevations = await getElevationsGrouped(batchPoints, apiID, apiKeys);
                elevationsGrouped = elevationsGrouped.concat(batchElevations);
            }
            
            // Assigns the elevations to the externalSectors
            externalSectors.forEach((externalSector, index) => {
                // Calculates the start and end indexes of the batch
                const start = index * elevationPoints;
                const end = start + elevationPoints;
            
                // Assign the X elevation values from elevationsGrouped to the current externalSector's elevations field
                externalSector.elevations = elevationsGrouped.slice(start, end);
            });

            // Assigns the elevations from externalSectors to gridElements
            externalSectors.forEach(externalSector => {
                gridElements.forEach(element => {
                    if (externalSector.bounds == element.bounds) {
                        element.elevations = externalSector.elevations;
                    }
                });
            });

            // Adjusts the resolution divisor based on the grid size for the compare radius.
            let resolutiondivisor = MID_SIZE_DIVISOR;
            if(gridSizeMeters >= 0 && gridSizeMeters < MID_GRID_SIZE){
                resolutiondivisor = SMALL_SIZE_DIVISOR;
            } else if(gridSizeMeters >= MID_GRID_SIZE && gridSizeMeters < LARGE_GRID_SIZE){
                resolutiondivisor = MID_SIZE_DIVISOR;
            } else if (gridSizeMeters >= LARGE_GRID_SIZE){
                resolutiondivisor = LARGE_SIZE_DIVISOR;
            }
            // Defines the radius for the comparison of distances between the center of the gridElement and the intermediate points 
            const compareRadius = gridResolution/resolutiondivisor;

            // Itinerates through each element of the gridElements array
            for (let i = 0; i < gridElements.length; i++) {
                let gridElement = gridElements[i];
                
                // Verifies if the 'elevations' array of the current gridElement is empty
                if (gridElement.elevations.length === 0) {
                    let { lat: centerLat, lng: centerLng } = gridElement.center;
                    let updated = false; // Variable to check if the elevations have been updated

                    // Itinerates through the externalSectors array
                    for (let j = 0; j < externalSectors.length; j++) {
                        let externalSector = externalSectors[j];
                        
                        // Itinerates through the intermediatePoints array of the externalSector
                        for (let k = 0; k < externalSector.intermediatePoints.length; k++) {
                            let intermediatePoint = externalSector.intermediatePoints[k];
                            let { lat: interLat, lng: interLng } = intermediatePoint;

                            // Calculates the distance between the center of the gridElement and the intermediate point
                            let distancia = calculateDistance(centerLat, centerLng, interLat, interLng);

                            // If the distance is less than or equal to the compareRadius, the elevations are copied from externalSector to gridElement
                            if (distancia <= compareRadius) {
                                gridElement.elevations = externalSector.elevations.slice(k);
                                updated = true; // Elevations have been updated
                                break; 
                            }
                        }

                        if (updated) break; // Breaks the loop if the elevations have been updated
                    }

                    if (updated) continue; // Continues to the next gridElement if the elevations have been updated
                }
            }

            // Generates an array to store the intermediate points that have not been found
            const remaningPoints = []
            for (let i = 0; i < gridElements.length; i++) {
                let gridElement = gridElements[i];
                
                if (gridElement.elevations.length === 0) {
                    gridElement.intermediatePoints.forEach(intermediatePoint => {
                        const latLng = {lat: intermediatePoint.lat, lng: intermediatePoint.lng};
                        remaningPoints.push(latLng);
                    });
                }
            }
           
            // Get the elevations of the remaining intermediate points
            //const remaningElevations  = await getElevationsGrouped(remaningPoints, apiID, apiKeys);
            const totalRemaningBatches = Math.ceil(remaningPoints.length / batchSize);
            let remaningElevations = [];
            for (let i = 0; i < totalRemaningBatches; i++) {
                const batchPoints = remaningPoints.slice(i * batchSize, (i + 1) * batchSize);
                const batchElevations = await getElevationsGrouped(batchPoints, apiID, apiKeys);
                remaningElevations = remaningElevations.concat(batchElevations);
            }

            // Assigns the elevations to the remaining intermediate points
            gridElements.forEach((element) => {
                let index = 0;
                // Calculates the start and end indexes of the batch
                const start = index * elevationPoints;
                const end = start + elevationPoints;

                if (element.elevations.length === 0) {
                    // Assign the X elevation values from remaningElevations to the current element's elevations field
                    element.elevations = remaningElevations.slice(start, end);
                    index++;
                }
            });

            // Calculate the occupation level for each sector and assign the color
            gridElements.forEach((elemento) => {
                const numberOfPoints = elemento.elevations.length;
                const distanceStep = elemento.totalDistance / (numberOfPoints - 1);

                for (let i = 0; i < numberOfPoints; i++) {
                    elemento.distances.push(Number(i * distanceStep).toFixed(0));
                }

                let occupationPercentage = 0;
                if(elemento.elevations.length === 0){
                    occupationPercentage = -1;
                } else {
                    occupationPercentage = calculate_occupation_percentage(
                        elemento.distances,
                        elemento.elevations,
                        elemento.totalDistance,
                        elemento.groundElevation,
                        elemento.gateway.alturaSuelo
                    );
                }
                
                // Assign the occupation level to the sector 
                elemento.occupationLevel = Math.trunc(occupationPercentage[0]);
    
                // If distance is less or equal to the assured communication radius, the color is green
                if (elemento.totalDistance <= ASSURED_COMMUNICATION_RADIUS) {
                    elemento.color = FULL_COMMUNICATION_COLOR;
                } else {
                    // Selects the color based on the occupation level
                    if (elemento.occupationLevel > NO_COMMUNICATION_PERCENTAGE) {
                        elemento.color = NO_COMMUNICATION_COLOR;
                        
                    } else if (elemento.occupationLevel > POOR_COMMUNICATION_PERCENTAGE[0] 
                        && elemento.occupationLevel <= POOR_COMMUNICATION_PERCENTAGE[1]) {
                        elemento.color = POOR_COMMUNICATION_COLOR;
                        
                    } else if (elemento.occupationLevel >= FULL_COMMUNICATION_PERCENTAGE[0] 
                        && elemento.occupationLevel <= FULL_COMMUNICATION_PERCENTAGE[1]) {
                        elemento.color = FULL_COMMUNICATION_COLOR;
                        
                    } else {
                        elemento.color = NULL_COMMUNICATION_COLOR;
                    }
                }

                sectors.push({
                    bounds: elemento.bounds,
                    center: elemento.checkPoint, 
                    color: elemento.color,
                    gateway: elemento.gateway,
                });
            });

            // Return the sectors
            res.status(200).json({ sectors });

        } catch (error) {
            res.status(500).json({ error: 'Error checking coverage' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}


// Converts a distance in meters to degrees of latitude.
const metersToLatDegrees = (meters) => {
    return meters / 111320;
};


// Converts meters to longitude degrees
const metersToLngDegrees = (meters, latitude) => {
    const latRadians = (latitude * Math.PI) / 180;
    return meters / (111320 * Math.cos(latRadians));
};
