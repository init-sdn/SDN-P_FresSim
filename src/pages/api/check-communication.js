// api/check-communication.js

import { calculateDistance, calculateIntermediatePoints, getElevations, calculate_occupation_percentage } from './process-json'; // Asegúrate de tener estas funciones en un archivo utils.js
import config from './config.json';

const ELEVATION_POINTS = config.ELEVATION_POINTS;
const NO_COMMUNICATION_PERCENTAGE = config.NO_COMMUNICATION_PERCENTAGE;

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { marker, gateway, apiID, apiKeys } = req.body;

            if (!marker || !gateway || !apiID || !apiKeys) {
                return res.status(400).json({ error: 'Missing parameter on check-communication' });
            }

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

            const hasCommunication = occupationPercentage[0] < NO_COMMUNICATION_PERCENTAGE;

            res.status(200).json({ hasCommunication });

        } catch (error) {
            res.status(500).json({ error: 'Error checking communication' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}