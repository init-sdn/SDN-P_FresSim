// api/process-json.js
/*
Esta versión realiza las peticiones de elevación a Maps Elevations API.
*/

import axios from 'axios';
import config from './config.json';
import {Client} from "@googlemaps/google-maps-services-js";

const DEFAULT_ALTITUDE = config.DEFAULT_ALTITUDE;
const CHUNK_SIZE = config.CHUNK_SIZE;
const ELEVATION_API_URL_BING = config.ELEVATION_API_URL_BING;
const ELEVATION_API_URL_OPEN_METEO = config.ELEVATION_API_URL_OPEN_METEO;
const ELEVATION_API_URL_OPEN_TOPO = config.ELEVATION_API_URL_OPEN_TOPO;
const ELEVATION_API_URL_GOOGLE = config.ELEVATION_API_URL_GOOGLE;

const GOOGLE_API_ID = config.GOOGLE_API_ID;
const BING_API_ID = config.BING_API_ID;
const OPEN_METEO_API_ID = config.OPEN_METEO_API_ID;
const OPEN_TOPO_API_ID = config.OPEN_TOPO_API_ID;

const EARTH_RADIUS = config.EARTH_RADIUS; // radio de la Tierra en metros
const LORA_FREQUENCY_MHZ = config.LORA_FREQUENCY_MHZ; // LoRa frequency (Europe) on MHz.
const SPEED_OF_LIGHT = config.SPEED_OF_LIGHT; // Speed of light in m/s
const LORA_FREQUENCY = LORA_FREQUENCY_MHZ * config.MHZ_TO_HZ; // Frequency in Hz
const ELEVATION_POINTS = config.ELEVATION_POINTS; //Number of points to calculate the elevation profile

const OPEN_METEO_MAX_POINTS_PER_BATCH = config.OPEN_METEO_MAX_POINTS_PER_BATCH;
const OPEN_METEO_DELAY_BETWEEN_REQUESTS_MS = config.OPEN_METEO_DELAY_BETWEEN_REQUESTS_MS;
const GOOGLE_MAX_POINTS_PER_BATCH = config.GOOGLE_MAX_POINTS_PER_BATCH;
const BING_MAX_POINTS_PER_BATCH = config.BING_MAX_POINTS_PER_BATCH;
const BING_DELAY_BETWEEN_REQUESTS_MS = config.BING_DELAY_BETWEEN_REQUESTS_MS;
const BING_MAX_RETRIES = config.BING_MAX_RETRIES;
const OPEN_TOPO_MAX_POINTS_PER_BATCH = config.OPEN_TOPO_MAX_POINTS_PER_BATCH;
const OPEN_TOPO_DELAY_BETWEEN_REQUESTS_MS = config.OPEN_TOPO_DELAY_BETWEEN_REQUESTS_MS;

const NO_COMMUNICATION_PERCENTAGE = config.NO_COMMUNICATION_PERCENTAGE;

const TIMEOUT = config.TIMEOUT;

// Get the points elevations using diferent elevation APIs
export const getElevations = async (points, apiID, apiKeys) => {
    const ELEVATION_API_KEY_BING = apiKeys.bing;
    const ELEVATION_API_KEY_GOOGLE = apiKeys.google;

    switch (apiID) {
        //Google Maps Elevation API library
        /*case GOOGLE_API_ID:
            const client = new Client({});
            let serverResponse = [];
            let googleResponse = null;

            await client.elevation({
                params: {
                locations: points,
                key: ELEVATION_API_KEY_GOOGLE,
                },
                timeout: 1000, // milliseconds
            })
            .then((r) => {
                googleResponse = r.data;

            })
            .catch((e) => {
                console.log(e.response.data.error_message);
            });
            
            googleResponse.results.forEach(function(item) {
                serverResponse.push(Math.round(item.elevation));
            });

            return serverResponse; */

        case GOOGLE_API_ID:
            const googlePointString = encodePointsGoogle(points);

            try {
                const response = await axios.get(
                    `${ELEVATION_API_URL_GOOGLE}locations=enc:${googlePointString}&key=${ELEVATION_API_KEY_GOOGLE}`,
                    { timeout: TIMEOUT }
                );
                return response.data.results.map(result => result.elevation);
            } catch (error) {
                console.error('Error fetching elevations:', error);
                return points.map(() => DEFAULT_ALTITUDE);
            }

        case BING_API_ID:
            const pointsString = points.map(point => `${point.lat},${point.lng}`).join(',');

            try {
                const response = await axios.get(
                    `${ELEVATION_API_URL_BING}key=${ELEVATION_API_KEY_BING}&points=${pointsString}`,
                    { timeout: TIMEOUT }
                );
                return response.data.resourceSets[0].resources[0].elevations;
            } catch (error) {
                console.error('Error fetching elevations:', error);
                return points.map(() => DEFAULT_ALTITUDE);
            }

            
        case OPEN_METEO_API_ID:
            const latitudes = points.map(point => `${point.lat}`).join(',');
            const longitudes = points.map(point => `${point.lng}`).join(',');

            try {
                const response = await axios.get(
                    `${ELEVATION_API_URL_OPEN_METEO}latitude=${latitudes}&longitude=${longitudes}`,
                    { timeout: TIMEOUT }
                );
                return response.data.elevation;
            } catch (error) {
                console.error('Error fetching elevations:', error);
                return points.map(() => DEFAULT_ALTITUDE);
            }

        case OPEN_TOPO_API_ID:
            const pointString = encodePointsGoogle(points);

            try {
                const response = await axios.get(
                    `${ELEVATION_API_URL_OPEN_TOPO}locations=${pointString}`,
                    { timeout: TIMEOUT }
                );
                return response.data.results.map(result => result.elevation);

            } catch (error) {
                console.error('Error fetching elevations:', error);
                return points.map(() => DEFAULT_ALTITUDE);
            }
    }

};


// Generates an array containing the points elevations
export const getElevationsGrouped = async (points, apiID, apiKeys) => {

    //Divides an array into batches
    const splitIntoBatches = (array, batchSize) => {
        const batches = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
    };

    const allElevations = [];
    let pointBatches = [];

    switch (apiID) {
        case GOOGLE_API_ID:
            // Divides the points into batches
            pointBatches = splitIntoBatches(points, GOOGLE_MAX_POINTS_PER_BATCH);

            try {
                // Process each batch of points
                for (const batch of pointBatches) {
                    const elevations = await getElevations(batch, apiID, apiKeys); 
                    allElevations.push(...elevations); // Adds the elevations to the array
                }

            } catch (error) {
                console.error('Error fetching elevations:', error);

                // Return default altitudes when an error occurs
                return points.map(() => DEFAULT_ALTITUDE);
            }
            break;
            

        case OPEN_METEO_API_ID:
            // Divides the points into batches
            pointBatches = splitIntoBatches(points, OPEN_METEO_MAX_POINTS_PER_BATCH);
            
            try {
                // Process each batch of points
                for (const batch of pointBatches) {
                    await sleep(OPEN_METEO_DELAY_BETWEEN_REQUESTS_MS);
                    const elevations = await getElevations(batch, apiID, apiKeys); 
                    allElevations.push(...elevations); // Adds the elevations to the array
                }

            } catch (error) {
                console.error('Error fetching elevations:', error);

                // Return default altitudes when an error occurs
                return points.map(() => DEFAULT_ALTITUDE);
            }
            break;


        case OPEN_TOPO_API_ID:
            // Divides the points into batches
            pointBatches = splitIntoBatches(points, OPEN_TOPO_MAX_POINTS_PER_BATCH);

            try {
                // Process each batch of points
                for (const batch of pointBatches) {
                    await sleep(OPEN_TOPO_DELAY_BETWEEN_REQUESTS_MS);
                    const elevations = await getElevations(batch, apiID, apiKeys);
                    allElevations.push(...elevations); // Adds the elevations to the array
                }

            } catch (error) {
                console.error('Error fetching elevations:', error);

                // Return default altitudes when an error occurs
                return points.map(() => DEFAULT_ALTITUDE);
            }
            break;


        case BING_API_ID:
            //Completes the missing elevations
            const fillMissingElevations = (elevations, expectedLength) => {
                const filledElevations = [...elevations];
                const lastElevation = elevations[elevations.length - 1];
                while (filledElevations.length < expectedLength) {
                    filledElevations.push(lastElevation);
                }
                return filledElevations;
            };

            //Get the elevations with retry
            const fetchElevationsWithRetry = async (batch, retries = BING_MAX_RETRIES) => {
                const pointsString = encodePointsBing(batch);
                let attempts = 0;

                while (attempts < retries) {
                    try {
                        await sleep(BING_DELAY_BETWEEN_REQUESTS_MS);
                        // Try to fetch elevations
                        const response = await axios.get(`${ELEVATION_API_URL_BING}key=${apiKeys.bing}&points=${pointsString}`);
                        let elevations = response.data.resourceSets[0].resources[0].elevations;

                        // Fill missing elevations if necessary
                        if (elevations.length < batch.length) {
                            elevations = fillMissingElevations(elevations, batch.length);
                        }

                        return elevations;

                    } catch (error) {
                        attempts++;
                        console.error(`Error fetching elevations for batch, attempt ${attempts}:`, error);

                        // Wait before retrying
                        if (attempts < retries) {
                            await sleep(BING_DELAY_BETWEEN_REQUESTS_MS);
                        } else {
                            throw new Error(`Failed to fetch elevations after ${retries} attempts`);
                        }
                    }
                }
            };

            // Adapts the points array to the Bing API format
            const transformedPoints = points.map(point => [point.lat, point.lng]);

            // Divides the points into batches
            pointBatches = splitIntoBatches(transformedPoints, BING_MAX_POINTS_PER_BATCH);

            try {
                // Process each batch of points
                for (const batch of pointBatches) {
                    const elevations = await fetchElevationsWithRetry(batch); 
                    allElevations.push(...elevations); // Adds the elevations to the array
                }

            } catch (error) {
                console.error('Error fetching elevations:', error);

                // Return default altitudes when an error occurs
                return points.map(() => DEFAULT_ALTITUDE);
            }
            break;
    
    }
    

    return allElevations;
};


//Generates a delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


//Codifies the points for the Bing elevations API
function encodePointsBing(points) {  
    var latitude = 0;  
    var longitude = 0;  
    var result = [];   
    var l;  
  
    for (var point in points ) {  
   
        var newLatitude = Math.round(points[point][0] * 100000);  
        var newLongitude = Math.round(points[point][1] * 100000);  
   
        var dy = newLatitude - latitude;  
        var dx = newLongitude - longitude;  
        latitude = newLatitude;  
        longitude = newLongitude;  
   
        dy = (dy << 1) ^ (dy >> 31);  
        dx = (dx << 1) ^ (dx >> 31);  
    
        var index = ((dy + dx) * (dy + dx + 1) / 2) + dy;  
  
        while (index > 0) {  
   
            var rem = index & 31;  
            index = (index - rem) / 32;  
    
            if (index > 0) rem += 32;  
  
            result.push("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-"[rem]);  
        }  
    }  
  
    return result.join("");  
}


// Codifies the points for the Google and Open-Topo elevations API
function encodePointsGoogle(coordinates) {
    let result = '';
    let prevLat = 0;
    let prevLng = 0;

    coordinates.forEach(({ lat, lng }) => {
        let latDiff = Math.round(lat * 1e5) - prevLat;
        let lngDiff = Math.round(lng * 1e5) - prevLng;

        result += encodeDiff(latDiff) + encodeDiff(lngDiff);

        prevLat += latDiff;
        prevLng += lngDiff;
    });

    return result;
}


// Auxiliary function to encode coordinate differences
function encodeDiff(diff) {
    let shifted = (diff < 0 ? ~(diff << 1) : (diff << 1));
    let encoded = '';

    while (shifted >= 0x20) {
        encoded += String.fromCharCode((0x20 | (shifted & 0x1f)) + 63);
        shifted >>= 5;
    }
    encoded += String.fromCharCode(shifted + 63);

    return encoded;
}


export const fresnel_zone_radius = (distance, total_distance) => {
    let wavelength = SPEED_OF_LIGHT / LORA_FREQUENCY;  // Lambda
    return Math.sqrt(wavelength * distance * (total_distance - distance) / total_distance);
}


export const calculate_max_fresnel_radius = (distance) => {
    return fresnel_zone_radius(parseFloat(distance / 2), parseFloat(distance));
};


export const calculate_occupation_percentage = (distancias, elevations, distance_elipse, startAltsuelo, endAltSuelo) => {
    let elevaciones = [...elevations];
    for (let i = 0; i <= elevaciones.length - 1; i++) {
        if (i === 0) {
            elevaciones[i] = elevaciones[i] + startAltsuelo;
        } else if (i === (elevaciones.length - 1)) {
            elevaciones[i] = elevaciones[i] + endAltSuelo;
        }
    }
    distancias = distancias.map(Number);
    let total_distance = distance_elipse;

    let losSlope = (elevaciones[elevaciones.length - 1] - elevaciones[0]) / total_distance;
    let losElevations = distancias.map(d => elevaciones[0] + losSlope * d);

    let maxOccupation = 0;
    let occupation = 0;

    for (let i = 0; i < distancias.length; i++) {
        let distanciaI = Math.sqrt(Math.pow(distancias[i] - distancias[0], 2) + Math.pow(losElevations[i] - elevaciones[0], 2));
        let fresnelRadius = fresnel_zone_radius(distanciaI, total_distance);

        // Altura del LOS más el radio de Fresnel
        let fresnelBottom = [distancias[i], losElevations[i] - fresnelRadius];

        if ((i !== 0) && (i !== (distancias.length - 1)) && (losElevations[i] < elevaciones[i])) {
            occupation = 100.0;
        } else if ((i !== 0) && (i !== (distancias.length - 1)) && (fresnelBottom[1] > elevaciones[i])) {
            occupation = 0.0;
        } else {
            if ((i !== 0) && (i !== (distancias.length - 1))) {
                occupation = ((elevaciones[i] - fresnelBottom[1]) * 100) / (losElevations[i] - fresnelBottom[1]);
            }
        }

        // Actualizar la ocupación máxima si es necesario
        if (occupation > maxOccupation) {
            if (occupation > 100.0) {
                maxOccupation = 100.0;
            } else {
                maxOccupation = occupation;
            }
        }
    }

    return [maxOccupation, losElevations];
};

export const toRad = (value) => {
    return (value * Math.PI) / 180;
};


export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    var phi1 = toRad(lat1);
    var phi2 = toRad(lat2);
    var phiVariat = toRad(lat2 - lat1);
    var alphaVariat = toRad(lon2 - lon1);

    var a = Math.sin(phiVariat / 2) * Math.sin(phiVariat / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(alphaVariat / 2) * Math.sin(alphaVariat / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    var distance = EARTH_RADIUS * c; // Distancia en metros
    return Math.round(distance);
};


const processServerData = async (data, res, apiID, apiKeys) => {
    const { markers, gateways } = data;

    // Procesar en paralelo todos los chunks de markers y gateways
    const markerChunks = [];
    for (let i = 0; i < markers.length; i += CHUNK_SIZE) {
        markerChunks.push(markers.slice(i, i + CHUNK_SIZE));
    }

    const gatewayChunks = [];
    for (let i = 0; i < gateways.length; i += CHUNK_SIZE) {
        gatewayChunks.push(gateways.slice(i, i + CHUNK_SIZE));
    }

    // Obtener elevaciones para todos los chunks en paralelo
    const markerElevationsPromises = markerChunks.map(chunk => getElevations(chunk, apiID, apiKeys));
    const gatewayElevationsPromises = gatewayChunks.map(chunk => getElevations(chunk, apiID, apiKeys));

    const markerElevations = await Promise.all(markerElevationsPromises);
    const gatewayElevations = await Promise.all(gatewayElevationsPromises);

    const altitudes = {};

    // Asignar elevaciones a los marcadores y gateways
    markerChunks.forEach((chunk, index) => {
        chunk.forEach((marker, i) => {
            marker.alt = markerElevations[index][i];
            altitudes[marker.id] = marker.alt;
        });
    });

    gatewayChunks.forEach((chunk, index) => {
        chunk.forEach((gateway, i) => {
            gateway.alt = gatewayElevations[index][i];
            altitudes[gateway.id] = gateway.alt;
        });
    });

    const MAX_CONCURRENT_REQUESTS = 1;
    const markersWithCommunication = [];
    const communicationData = {};

    for (let i = 0; i < markers.length; i += MAX_CONCURRENT_REQUESTS) {
        const markerBatch = markers.slice(i, i + MAX_CONCURRENT_REQUESTS);
        await Promise.all(markerBatch.map(async marker => {
            communicationData[marker.id] = {};
            marker.hasCommunication = false;

            for (const gateway of marker.associatedGateways) {
                let totalDistance = calculateDistance(marker.lat, marker.lng, gateway.lat, gateway.lng);

                const intermediatePoints = calculateIntermediatePoints(
                    { lat: marker.lat, lng: marker.lng },
                    { lat: gateway.lat, lng: gateway.lng },
                    ELEVATION_POINTS
                );

                const elevations = await getElevations(intermediatePoints, apiID, apiKeys);

                const numberOfPoints = elevations.length;
                const distanceStep = totalDistance / (numberOfPoints - 1);

                const distances = [];
                for (let i = 0; i < numberOfPoints; i++) {
                    distances.push(Number(i * distanceStep).toFixed(0));
                }

                let occupationPercentage = calculate_occupation_percentage(
                    distances,
                    elevations,
                    totalDistance,
                    marker.alturaSuelo,
                    gateway.alturaSuelo
                );

                if (occupationPercentage[0] < NO_COMMUNICATION_PERCENTAGE) {
                    marker.hasCommunication = true;
                    markersWithCommunication.push(marker.id);
                    communicationData[marker.id][gateway.id] = true;
                } else {
                    communicationData[marker.id][gateway.id] = false;
                }
            }
        }));
    }

    return {
        markers,
        gateways,
        markersWithCommunication,
        communicationData,
        altitudes
    };
};


export const calculateIntermediatePoints = (start, end, numberOfPoints) => {
    let points = [];
    let lat = start.lat;
    let lng = start.lng
    points.push({ lat, lng });
    for (let i = 1; i <= numberOfPoints - 2; i++) {
        lat = start.lat + ((end.lat - start.lat) * i) / numberOfPoints;
        lng = start.lng + ((end.lng - start.lng) * i) / numberOfPoints;
        points.push({ lat, lng });
    }
    lat = end.lat;
    lng = end.lng
    points.push({ lat, lng });
    return points;
};


export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const {cleanedData, apiID, apiKeys} = req.body;

            if (!cleanedData) {
                return res.status(400).json({ error: 'No data sent' });
            }
            
            const { markers, gateways, markersWithCommunication, communicationData, altitudes } = await processServerData(cleanedData, res, apiID, apiKeys); // Pasar 'res' a processServerData

            res.status(200).json({
                message: 'Data processed successfully',
                totalMarkers: markers.length,
                totalGateways: gateways.length,
                totalJSONFilesUploaded: 1,
                markersWithCommunication,
                communicationData,
                altitudes
            });

        } catch (error) {
            res.status(500).json({ error: 'Error processing data' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}