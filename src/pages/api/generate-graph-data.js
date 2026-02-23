import {
    calculateDistance,
    calculateIntermediatePoints,
    getElevations,
    calculate_occupation_percentage,
    fresnel_zone_radius,
    toRad,
    calculate_max_fresnel_radius
} from './process-json';

const ELEVATION_POINTS = 60;

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { marker, selectedGateways, minAltitude, maxAltitude, apiID, apiKeys } = req.body;

            if (!marker || !selectedGateways || selectedGateways.length === 0) {
                return res.status(400).json({ error: 'Missing marker or gateway data' });
            }

            const allChartData = [];

            for (const gateway of selectedGateways) {
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

                let values = calculate_occupation_percentage(
                    distances,
                    elevations,
                    totalDistance,
                    marker.alturaSuelo,
                    gateway.alturaSuelo
                );

                let occupationPercentage = values[0];
                let losElevations = values[1];

                let graphHeights = [];
                for (let i = 0; i < losElevations.length; i++) {
                    graphHeights.push(fresnel_zone_radius(distances[i], totalDistance) + losElevations[i]);
                }
                let maxGraphHeight = Math.max(...graphHeights);

                let minY;
                let maxY;
                if (minAltitude !== 0.0 || maxAltitude !== 0.0) {
                    minY = minAltitude;
                    maxY = maxAltitude;
                } else {
                    minY = undefined;
                    maxY = undefined;
                }

                if ((maxY < maxGraphHeight) || (maxY === undefined)) {
                    maxY = maxGraphHeight;
                }

                // Número deseado de ticks en el eje y
                const desiredTicks = 10;

                // Calcula el rango y el intervalo de ticks ideal
                let range = maxY - (minY || 0);

                // Ajusta el intervalo de ticks basado en el rango de valores
                let tickIntervalAdjusted = Math.floor(range / desiredTicks);
                tickIntervalAdjusted = Math.pow(10, Math.floor(Math.log10(tickIntervalAdjusted))); // Ajusta al orden de magnitud más cercano

                // Ajuste fino basado en el rango
                let factor = range / (tickIntervalAdjusted * desiredTicks);
                if (factor < 3) {
                    tickIntervalAdjusted /= 5;
                } else if (factor < 5) {
                    tickIntervalAdjusted /= 2;
                }

                // Asegura que maxY se ajusta para incluir el valor máximo dentro del intervalo de ticks
                maxY = Math.ceil(maxY / tickIntervalAdjusted) * tickIntervalAdjusted;
                if (maxY < maxGraphHeight) {
                    maxY += tickIntervalAdjusted;
                }

                if (maxY < Math.max(...elevations)) {
                    maxY = undefined;
                }

                const elev_diff = Math.abs(gateway.alt + gateway.alturaSuelo - marker.alt - marker.alturaSuelo);

                const options = {
                    scales: {
                        y: {
                            beginAtZero: false,
                            title: {
                                display: true,
                                text: "Altitude (m)",
                            },
                            min: minY,
                            max: maxY,
                            ticks: {
                                stepSize: tickIntervalAdjusted,
                                callback: function (value) {
                                    return Number(value).toFixed(0);
                                },
                            },
                        },
                        x: {
                            min: 0,
                            max: numberOfPoints,
                            title: {
                                display: true,
                                text: "Distance (m)",
                            },
                        },
                    },
                    plugins: {
                        customEllipse: {
                            height: 2 * calculate_max_fresnel_radius(totalDistance),
                            gwAlt: parseInt(gateway.alt) + parseInt(gateway.alturaSuelo),
                            markAlt: parseInt(marker.alt) + parseInt(marker.alturaSuelo),
                            totalDistance: numberOfPoints - 1,
                        },
                        legend: {
                            display: true,
                            position: "bottom",
                            labels: {
                                filter: function (item, chart) {
                                    return item.datasetIndex === 1 || item.datasetIndex === 2;
                                },
                            },
                        },
                        title: {
                            display: true,
                            padding: {
                                bottom: 10,
                            },
                            text: [
                                `Elevation Difference: ${elev_diff} m | Distance between Points: ${totalDistance} m`,
                                `Fresnel Occupation: ${occupationPercentage.toFixed(2)}%`,
                                `RSSI: ${marker.rssi} dBm | SNR: ${marker.snr} dB`
                            ],
                            font: {
                                size: 15,
                            },
                        },
                    },
                };

                let gatewayIcon = new Array(numberOfPoints).fill(null);
                gatewayIcon[numberOfPoints - 1] = parseInt(gateway.alt) + parseInt(gateway.alturaSuelo);

                const data = {
                    labels: distances,
                    datasets: [
                        {
                            label: "Elevation",
                            data: elevations,
                            fill: true,
                            borderColor: "rgb(255, 165, 0)",
                            backgroundColor: "rgba(255, 165, 0, 0.5)",
                            tension: 0.1,
                            pointRadius: 0,
                        },
                        {
                            label: marker.name,
                            data: [
                                { x: 0, y: parseInt(marker.alt) + parseInt(marker.alturaSuelo) },
                            ],
                            pointBackgroundColor: "green",
                            pointBorderColor: "green",
                            borderColor: "green",
                            backgroundColor: "green",
                            pointRadius: 5,
                            showLine: false,
                        },
                        {
                            label: gateway.name,
                            data: gatewayIcon,
                            pointBackgroundColor: "black",
                            pointBorderColor: "black",
                            borderColor: "black",
                            backgroundColor: "black",
                            pointRadius: 5,
                            showLine: false,
                        },
                        {
                            label: "Line Of Sight",
                            data: [{ x: 0, y: parseInt(marker.alt) + parseInt(marker.alturaSuelo) }, { x: distances[distances.length - 1], y: parseInt(gateway.alt) + parseInt(gateway.alturaSuelo) }],
                            fill: false,
                            borderColor: "rgb(255, 0, 0)",
                            tension: 0.1,
                            pointRadius: 0,
                            borderWidth: 2,
                            borderDash: [5, 5],
                        },
                    ],
                    options: options,
                };

                allChartData.push(data);
            }

            res.status(200).json({ allChartData });

        } catch (error) {
            res.status(500).json({ error: 'Error generating graph data' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}