import { v4 as uuidv4 } from 'uuid';
import { useState } from 'react';
import LoadingOverlay from '@components/LoadingOverlay';

const DEFAULT_GROUND_ALTITUDE = 2;

const DataLoader = ({ setJsonLoaded, setFileInfo, setMarkers, setGateways, apiID, apiKeys }) => {

    const [isLoading, setIsLoading] = useState(false);
    const [jsonType, setJsonType] = useState('chirpstack'); // Default to ChirpStack

    const handleFileChange = async (event) => {
        const files = event.target.files;
        if (files.length > 0) {

            setIsLoading(true);

            const promises = [];

            // Process each file sequentially
            for (const file of files) {
                const reader = new FileReader();

                const promise = new Promise((resolve) => {
                    reader.onload = async (e) => {
                        const content = e.target.result;
                        const data = JSON.parse(content);

                        try {
                            const cleanedData = processJson(data, jsonType); // Pass the jsonType

                            const response = await fetch('/fressim/api/process-json', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({cleanedData, apiID, apiKeys}),
                            });

                            if (response.ok) {
                                const result = await response.json();

                                // Update file info by accumulating the new data
                                setFileInfo(prev => ({
                                    totalJSONFilesUploaded: prev.totalJSONFilesUploaded + 1,
                                    totalMarkers: prev.totalMarkers + result.totalMarkers,
                                    totalGateways: prev.totalGateways + result.totalGateways
                                }));

                                const updatedMarkers = cleanedData.markers.map(marker => ({
                                    ...marker,
                                    alt: result.altitudes[marker.id],
                                    hasCommunication: result.markersWithCommunication.includes(marker.id),
                                    communicationData: result.communicationData[marker.id]
                                }));

                                const updatedGateways = cleanedData.gateways.map(gateway => ({
                                    ...gateway,
                                    alt: result.altitudes[gateway.id]
                                }));

                                // Append new markers and gateways to the existing ones
                                setMarkers(prevMarkers => [...prevMarkers, ...updatedMarkers]);
                                setGateways(prevGateways => [...prevGateways, ...updatedGateways]);

                                setJsonLoaded(true);
                            } else {
                                console.error('Error uploading data');
                            }

                            resolve();
                        } catch (error) {
                            console.error('Error:', error);
                        }
                    };
                });

                promises.push(promise);
                reader.readAsText(file);
            }

            await Promise.all(promises);

            setIsLoading(false); // Set loading to false after all files are processed
        }
    };

    const processChirpStackJson = (data) => {

        const cleanedData = {
            markers: [],
            gateways: []
        };

        // Procesa el archivo JSON para extraer los datos básicos
        for (const item of data) {
            let associatedGateways = [];
            if (item.rxInfo) {
                for (const rx of item.rxInfo) {
                    let gateway;

                    // Buscar si el gateway ya existe en uniqueGateways (comparando solo gatewayId)
                    const existingGateway = cleanedData.gateways.find(gw => gw.gatewayId === rx.gatewayId);

                    if (existingGateway) {
                        gateway = existingGateway;
                    } else {
                        const gatewayName = rx.name || rx.gatewayId;

                        gateway = {
                            id: uuidv4(),
                            lat: rx.location.latitude,
                            lng: rx.location.longitude,
                            alt: 0,
                            isGateway: true,
                            name: gatewayName,
                            alturaSuelo: rx.location.alturaSuelo || DEFAULT_GROUND_ALTITUDE,
                            gatewayId: rx.gatewayId,
                            associatedGateways: []
                        };
                        cleanedData.gateways.push(gateway);
                    }
                    associatedGateways.push(gateway);
                }
            }

            const gpsLocation = item.object?.gpsLocation?.["1"];
            const rxInfo = item.rxInfo;
            if (gpsLocation) {
                const newMarker = {
                    id: uuidv4(),
                    name: item.deviceInfo?.deviceName || item.deviceName,
                    lat: gpsLocation.latitude,
                    lng: gpsLocation.longitude,
                    alt: gpsLocation.altitude,
                    rssi: rxInfo.length > 0 ? rxInfo[0].rssi : 0,
                    snr: rxInfo.length > 0 ? rxInfo[0].snr : 0,
                    alturaSuelo: gpsLocation.alturaSuelo || DEFAULT_GROUND_ALTITUDE,
                    isGateway: false,
                    associatedGateways: associatedGateways.map(gw => ({
                        id: gw.id,
                        name: gw.name,
                        lat: gw.lat,
                        lng: gw.lng,
                        alturaSuelo: gw.alturaSuelo,
                        isGateway: true,
                        gatewayId: gw.gatewayId,
                        rssi: 0,
                        snr: 0
                    }))
                };

                cleanedData.markers.push(newMarker);
            }
        }

        const uniqueMarkers = cleanedData.markers.filter(newMarker => !cleanedData.markers.concat(cleanedData.markers).some(existingMarker =>
            existingMarker !== newMarker &&
            existingMarker.lat === newMarker.lat &&
            existingMarker.lng === newMarker.lng
        ));

        cleanedData.markers = uniqueMarkers;

        return cleanedData;
    };

    const processTtnJson = (data) => {

        const cleanedData = {
            markers: [],
            gateways: []
        };

        // Procesa cada item del JSON
        data.forEach(item => {
            let associatedGateways = [];
            // Verifica si el campo uplink_message existe antes de acceder a él
            if (item.data && item.data.uplink_message) {
                const uplinkMessage = item.data.uplink_message;

                const decodedPayload = uplinkMessage.decoded_payload;

                // Procesa los gateways asociados a este uplink_message
                if (uplinkMessage.rx_metadata && Array.isArray(uplinkMessage.rx_metadata)) {
                    uplinkMessage.rx_metadata.forEach(gateway => {
                        const defaultGwId = uuidv4();
                        const gatewayId = gateway.gateway_ids?.gateway_id || defaultGwId;
                        const gatewayLat = gateway.location?.latitude || null;
                        const gatewayLng = gateway.location?.longitude || null;

                        // Si tiene coordenadas válidas, agregar el gateway al array
                        if (gatewayLat !== null && gatewayLng !== null) {
                            const newGateway = {
                                id: gatewayId,
                                lat: gatewayLat,
                                lng: gatewayLng,
                                alt: 0,
                                isGateway: true,
                                name: gatewayId,
                                alturaSuelo: DEFAULT_GROUND_ALTITUDE,
                                gatewayId: gatewayId,
                                associatedGateways: []
                            };
                            cleanedData.gateways.push(newGateway);

                            associatedGateways.push(newGateway);
                        }
                    });
                }

                // Procesa el marcador del dispositivo
                if (decodedPayload && decodedPayload.gps_1) {
                    const gpsLocation = decodedPayload.gps_1;

                    const newMarker = {
                        id: uuidv4(),
                        name: item.identifiers[0].device_ids.device_id,
                        lat: gpsLocation.latitude,
                        lng: gpsLocation.longitude,
                        alt: gpsLocation.altitude,
                        rssi: uplinkMessage.rx_metadata[0]?.rssi || 0,
                        snr: uplinkMessage.rx_metadata[0]?.snr || 0,
                        isGateway: false,
                        associatedGateways: associatedGateways.map(gw => ({
                            id: gw.id,
                            name: gw.name,
                            lat: gw.lat,
                            lng: gw.lng,
                            alturaSuelo: gw.alturaSuelo,
                            isGateway: true,
                            gatewayId: gw.gatewayId,
                            rssi: 0,
                            snr: 0
                        }))
                    };

                    cleanedData.markers.push(newMarker);
                }

            }
        });

        // Filtra marcadores únicos basados en su latitud y longitud
        const uniqueMarkers = cleanedData.markers.filter((newMarker, index, self) =>
            index === self.findIndex((existingMarker) =>
                existingMarker.lat === newMarker.lat && existingMarker.lng === newMarker.lng
            )
        );

        // Filtra gateways únicos basados en su latitud y longitud
        const uniqueGateways = cleanedData.gateways.filter((newGateway, index, self) =>
            index === self.findIndex((existingGateway) =>
                existingGateway.lat === newGateway.lat && existingGateway.lng === newGateway.lng
            )
        );

        cleanedData.markers = uniqueMarkers;
        cleanedData.gateways = uniqueGateways;

        console.log(cleanedData);

        return cleanedData;
    };


    const processJson = (data, type) => {
        const cleanedData = {
            markers: [],
            gateways: []
        };

        // Process JSON based on the type
        if (type === 'chirpstack') {
            return processChirpStackJson(data);
        } else if (type === 'ttn') {
            return processTtnJson(data);
        }

        const uniqueMarkers = cleanedData.markers.filter(newMarker => !cleanedData.markers.concat(cleanedData.markers).some(existingMarker =>
            existingMarker !== newMarker &&
            existingMarker.lat === newMarker.lat &&
            existingMarker.lng === newMarker.lng
        ));

        cleanedData.markers = uniqueMarkers;

        return cleanedData;
    };

    return (
        <div className="container d-flex justify-content-center">
            <div className="row">
                <div className="col-12">
                    <div className="card mt-4" style={{ width: '600px', margin: '0 auto' }}>
                        <div className="card-header text-center">DATA UPLOAD</div>
                        <div className="card-body d-flex flex-column align-items-center">
                            <div className="form-group w-100">
                                <label htmlFor="jsonTypeSelect" className="text-center w-100">Select LoRaWAN-based IoT platform:</label>
                                <select
                                    id="jsonTypeSelect"
                                    className="form-select" // Cambia de 'form-control' a 'form-select'
                                    value={jsonType}
                                    onChange={(e) => setJsonType(e.target.value)}
                                    disabled={isLoading}
                                >
                                    <option value="chirpstack">ChirpStack JSON</option>
                                    <option value="ttn">TTN JSON</option>
                                </select>
                            </div>
                            <div style={{ marginTop: '0.1px' }}></div>
                            <input
                                type="file"
                                id="jsonFile"
                                className="form-control"
                                onChange={handleFileChange}
                                accept=".json"
                                name="jsonFile"
                                multiple
                                style={{ display: 'none' }}
                                disabled={isLoading}
                            />
                            <label htmlFor="jsonFile" className="btn btn-primary text-center mt-3">
                                Select JSON Files
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            <LoadingOverlay isLoading={isLoading} />
        </div>
    );
};

export default DataLoader;
