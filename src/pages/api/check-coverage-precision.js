// api/check-coverage-precision.js
/*
Version 3 - Coverage map generation API. 
This mode groups the intermediate points and makes the elevation API requests in batches.
*/

import { calculateDistance, calculateIntermediatePoints, getElevationsGrouped, calculate_occupation_percentage } from './process-json';
import config from './config.json';

const ELEVATION_POINTS = config.ELEVATION_POINTS;

const FULL_COMMUNICATION_PERCENTAGE = config.FULL_COMMUNICATION_PERCENTAGE;
const POOR_COMMUNICATION_PERCENTAGE = config.POOR_COMMUNICATION_PERCENTAGE;
const NO_COMMUNICATION_PERCENTAGE = config.NO_COMMUNICATION_PERCENTAGE;
const ASSURED_COMMUNICATION_RADIUS = config.ASSURED_COMMUNICATION_RADIUS;

const FULL_COMMUNICATION_COLOR= config.FULL_COMMUNICATION_COLOR;
const POOR_COMMUNICATION_COLOR = config.POOR_COMMUNICATION_COLOR;
const NO_COMMUNICATION_COLOR = config.NO_COMMUNICATION_COLOR;
const NULL_COMMUNICATION_COLOR = config.NULL_COMMUNICATION_COLOR;

const GOOGLE_API_ID = config.GOOGLE_API_ID;
const BING_API_ID = config.BING_API_ID;


export default async function handler(req, res) {
    const sectors = [];  // Contains the coverage map sectors
    const gridElements = []; // Array to store grid elements, each representing a sector of the coverage map

    if (req.method === 'POST') {
        try {
            const { gateway, gridSizeMeters, gridResolution, checkPointsGroundElevation, apiID, apiKeys } = req.body;

            if (!gateway || !gridSizeMeters || !gridResolution || !checkPointsGroundElevation) {
                return res.status(400).json({ error: 'Missing elements on coverage map precision generation API' });
            }

            if (apiID == GOOGLE_API_ID && apiKeys.google == '') {
                return res.status(400).json({ error: 'Introduce your Google API key' });
            }

            if (apiID == BING_API_ID && apiKeys.bing == '') {
                return res.status(400).json({ error: 'Introduce your Bing API key' });
            }
                

            const halfGridSizeMeters = gridSizeMeters / 2;
            const centerLat = gateway.lat;
            const centerLng = gateway.lng;
            
            // Generating sectors
            for (let latOffset = -halfGridSizeMeters; latOffset < halfGridSizeMeters; latOffset += gridResolution) {
                const lat1 = centerLat + metersToLatDegrees(latOffset);  // Left top corner
                const lat2 = centerLat + metersToLatDegrees(latOffset + gridResolution);  // Right bottom corner
        
                for (let lngOffset = -halfGridSizeMeters; lngOffset < halfGridSizeMeters; lngOffset += gridResolution) {
                    const lng1 = centerLng + metersToLngDegrees(lngOffset, centerLat);  // Left top corner
                    const lng2 = centerLng + metersToLngDegrees(lngOffset + gridResolution, centerLat);  // Right bottom corner
                    
                    const checkPoint = {
                        lat: (lat1 + lat2) / 2,
                        lng: (lng1 + lng2) / 2,
                        groundElevation: checkPointsGroundElevation
                    };

                    let totalDistance = calculateDistance(checkPoint.lat, checkPoint.lng, gateway.lat, gateway.lng);

                    const intermediatePoints = calculateIntermediatePoints(
                        { lat: checkPoint.lat, lng: checkPoint.lng },
                        { lat: gateway.lat, lng: gateway.lng },
                        ELEVATION_POINTS
                    );
                    
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
                        gateway: gateway
                    });
                    
                }
            }

            const points = [];
            gridElements.forEach(element => {
                element.intermediatePoints.forEach(intermediatePoint => {
                    const latLng = {lat: intermediatePoint.lat, lng: intermediatePoint.lng};
                    points.push(latLng);
                });
            });

            // Get the sectors intermediate points elevations
            const elevationsGrouped = await getElevationsGrouped(points, apiID, apiKeys);

            gridElements.forEach((element, index) => {
                // Calculates the start and end indexes of the batch
                const start = index * ELEVATION_POINTS;
                const end = start + ELEVATION_POINTS;
            
                // Assign the X elevation values from elevationsGrouped to the current element's elevations field
                element.elevations = elevationsGrouped.slice(start, end);
            });
            
            gridElements.forEach((elemento) => {
                const numberOfPoints = elemento.elevations.length;
                const distanceStep = elemento.totalDistance / (numberOfPoints - 1);

                for (let i = 0; i < numberOfPoints; i++) {
                    elemento.distances.push(Math.round(i * distanceStep));
                }

                let occupationPercentage = calculate_occupation_percentage(
                    elemento.distances,
                    elemento.elevations,
                    elemento.totalDistance,
                    elemento.groundElevation,
                    elemento.gateway.alturaSuelo
                );
                
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
                    gateway: elemento.gateway
                });
            });

            // Return the sectors
            res.status(200).json({ sectors });

        } catch (error) {
            console.error('Error checking coverage:', error);
            res.status(500).json({ error: 'Error checking coverage' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}


// Converts meters to latitude degrees
const metersToLatDegrees = (meters) => {
    return meters / 111320;
};


// Converts meters to longitude degrees
const metersToLngDegrees = (meters, latitude) => {
    const latRadians = (latitude * Math.PI) / 180;
    return meters / (111320 * Math.cos(latRadians));
};
