import { useState, useEffect, useRef } from 'react';
import Leaflet from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, useMapEvents, LayersControl, LayerGroup, useMapEvent } from 'react-leaflet';
import { v4 as uuidv4 } from 'uuid';
import 'leaflet/dist/leaflet.css';
import styles from './Map.module.scss';
import ReactDOMServer from 'react-dom/server';
import axios from 'axios';



import RemoveGatewayModal from '@components/Modals/RemoveGatewayModal';
import RemoveMarkerModal from '@components/Modals/RemoveMarkerModal';
import EditAlturaSueloModal from '@components/Modals/EditAlturaSueloModal';
import EditNombreModal from '@components/Modals/EditNombreModal';
import EditRssiAndSnrModal from '@components/Modals/EditRssiAndSnrModal';
import EditPositionModal from '@components/Modals/EditPositionModal';
import LoadingOverlay from '@components/LoadingOverlay';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPencil,
  faLocationArrow,
  faTrash,
  faPodcast,
  faLineChart,
  faSignal
} from '@fortawesome/free-solid-svg-icons'


const DynamicMap = ({
  markers = [],
  gateways = [],
  setMarkers,
  setGateways,
  fileInfo,
  setFileInfo,
  handleOpenGatewayAssignModal,
  handleOpenGraphGeneratorModal,
  handleOpenRadiusGeneratorModal,
  setJsonLoaded,
  className,
  width,
  height,
  gridGatewayCoordinates,
  gridParameters,
  apiID,
  apiKeys,
  generatorMode,
  config,
  ...rest
}) => {

  const [showRemoveMarkerModal, setShowRemoveMarkerModal] = useState(false);
  const [showRemoveGatewayModal, setShowRemoveGatewayModal] = useState(false);
  const [showEditAlturaModal, setShowEditAlturaModal] = useState(false);
  const [showEditNombreModal, setShowEditNombreModal] = useState(false);
  const [showEditRssiAndSnrModal, setShowEditRssiAndSnrModal] = useState(false);
  const [showEditPositionModal, setShowEditPositionModal] = useState(false);
  const [editingGateway, setEditingGateway] = useState(null);
  const [editingMarkerId, setEditingMarkerId] = useState(null);
  const [markerToDelete, setMarkerToDelete] = useState(null);
  const [gatewayToDelete, setGatewayToDelete] = useState(null);
  const [gridRectangles, setGridRectangles] = useState([]);

  const handleCloseRemoveMarkerModal = () => setShowRemoveMarkerModal(false);
  const handleCloseRemoveGatewayModal = () => setShowRemoveGatewayModal(false);
  const handleCloseEditAlturaModal = () => setShowEditAlturaModal(false);
  const handleCloseEditNombreModal = () => setShowEditNombreModal(false);
  const handleCloseEditRssiAndSnrModal = () => setShowEditRssiAndSnrModal(false);
  const handleCloseEditPositionModal = () => setShowEditPositionModal(false);

  const [isLoading, setIsLoading] = useState(false);

  const [visibleGateways, setVisibleGateways] = useState(new Set());

  let mapClassName = styles.map;

  const {BaseLayer} = LayersControl;

  if (className) {
    mapClassName = `${mapClassName} ${className}`;
  }

  useEffect(() => {
    if (gridParameters) {
      generateGrid(
        gridParameters.gateway,
        gridParameters.radius,
        gridParameters.resolution,
        gridParameters.checkPointsGroundElevation,
        gridParameters.elevationPoints
      );
    }
  }, [gridParameters]);


  // Generates the grid of sectors around a given gateway based on specified parameters such as grid size, resolution, and elevation points.
  const generateGrid = async (gateway, gridSizeMeters, gridResolution, checkPointsGroundElevation, elevationPoints) => {
    setIsLoading(true);
    
    console.time("GRID GENERATION TIME");
    const sectors = await generateSectorsMap(gateway, gridSizeMeters, gridResolution, checkPointsGroundElevation, elevationPoints);
    console.timeEnd("GRID GENERATION TIME");

    try {
      setGridRectangles(prevGridRectangles => prevGridRectangles.filter(sector => sector.gateway.id !== gateway.id));
      setGridRectangles(prevSectors => [...prevSectors, ...sectors]);
    } catch (error) {
      console.error('Error generating grid:', error);
    }
    
    setIsLoading(false);
  };


  // Makes a request to the API to get the coverage map
  const generateSectorsMap = async (gateway, gridSizeMeters, gridResolution, checkPointsGroundElevation, elevationPoints) => {
    let generator = "";
    switch (generatorMode) {
      case config.generatorModes.speed:
        generator = config.generatorModesUrls.speed;
        break;
      
      case config.generatorModes.precision:
        generator = config.generatorModesUrls.precision;
        break;
    }

    try {
      const response = await fetch(generator, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gateway,
          gridSizeMeters,
          gridResolution,
          checkPointsGroundElevation,
          apiID,
          apiKeys,
          elevationPoints
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.sectors;
      } else {
        console.error('Error fetching coverage map data');
      }
    } catch (error) {
      console.error('Error:', error);
    }

  };

  //Clear the grid
  const clearGrid = () => {
    setGridRectangles([]);
  };


  //Get the elevation of a point
  const getElevation = async (lat, lng) => {
    try {
      const point = [{ lat: lat, lng: lng }];
      const elevation = await getServerElevation(point, apiID, apiKeys);
      return elevation;

    } catch (error) {
      console.error('Error fetching elevations:', error);
      return DEFAULT_GROUND_ALTITUDE; // Devuelve altitud por defecto.
    }
  };


  // Request to API for a point's elevation with timeout handling
  const getServerElevation = async (points, apiID, apiKeys) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch('/fressim/api/get-elevation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          points,
          apiID,
          apiKeys,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        return result;
      } else {
        console.error('Error fetching coverage level data');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Request timed out');
      } else {
        console.error('Error:', error);
      }
    }
  };


  useEffect(() => {
    // Esta función se ejecutará cada vez que `markers` cambie
    // Puedes agregar aquí lógica adicional para actualizar el mapa si es necesario
  }, [markers]);


  const MapEventsHandler = () => {
    useMapEvents({
      click: async (e) => {
        // Verificar si el clic ocurrió en el botón "Clear Grid"
        if (e.originalEvent.target.closest('#clear-grid-button')) {
          return;
        }
        const isMarker = window.confirm("Is this a point?");
        if (isMarker) {
          // Clic izquierdo para añadir un marker
          const isGateway = false;
          let elevation = await getElevation(e.latlng.lat, e.latlng.lng);
          const newMarker = {
            id: uuidv4(),
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            alt: elevation,
            isGateway,
            name: 'new-point',
            rssi: 0,
            snr: 0,
            alturaSuelo: 2,
            associatedGateways: []
          };

          setMarkers(prevMarkers => [...prevMarkers, newMarker]);
          setFileInfo(prev => ({ ...prev, totalMarkers: prev.totalMarkers + 1 }));
          setJsonLoaded(true);
        }
      },
      contextmenu: async (e) => {
        if (e.originalEvent.target.closest('#clear-grid-button')) {
          return; 
        }
        // Clic derecho para añadir un gateway
        const isGateway = window.confirm("Is this a gateway?");
        let elevation = await getElevation(e.latlng.lat, e.latlng.lng);
        if (isGateway) {
          const newGateway = {
            id: uuidv4(),
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            alt: elevation,
            isGateway,
            name: 'new-gw',
            rssi: 0,
            snr: 0,
            alturaSuelo: 0,
            associatedGateways: []
          };

          setVisibleGateways(prevVisibleGateways => new Set([...prevVisibleGateways, newGateway.id]));
          setGateways(prevGateways => [...prevGateways, newGateway]);
          setFileInfo(prev => ({ ...prev, totalGateways: prev.totalGateways + 1 }));
          setJsonLoaded(true);
        }
      }
    });
    return null;
  };


  const removeMarker = (markerId) => {
    setMarkerToDelete(markerId);
    setShowRemoveMarkerModal(true);
  };

  const removeGateway = (gatewayId) => {
    setGatewayToDelete(gatewayId);
    setShowRemoveGatewayModal(true);
  };

  const editAlturaModal = (markerId) => {
    setEditingMarkerId(markerId);
    setShowEditAlturaModal(true);
  };

  const editNombreModal = (markerId) => {
    setEditingMarkerId(markerId);
    setShowEditNombreModal(true);
  }

  const editRssiAndSnr = (markerId) => {
    setEditingMarkerId(markerId);
    setShowEditRssiAndSnrModal(true);
  };

  const handleSavePosition = async (newPosition) => {
    if (editingGateway) { // Verificar si se está editando un gateway
      // Actualiza la posición del gateway
      setGateways(prevGateways => prevGateways.map(gateway =>
        gateway.id === editingGateway.id ? { ...gateway, lat: newPosition[0], lng: newPosition[1] } : gateway
      ));

      // Encuentra todos los marcadores asociados a este gateway
      const associatedMarkers = markers.filter(marker =>
        marker.associatedGateways.some(gw => gw.id === editingGateway.id)
      );

      // Vuelve a calcular la comunicación para cada marcador asociado
      for (const marker of associatedMarkers) {
        const response = await fetch('/fressim/api/check-communication', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            marker,
            gateway: { ...editingGateway, lat: newPosition[0], lng: newPosition[1] },
            apiID
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const hasCommunication = result.hasCommunication;

          // Actualiza communicationData en el marcador
          setMarkers(prevMarkers => prevMarkers.map(m =>
            m.id === marker.id ? {
              ...m,
              communicationData: {
                ...m.communicationData,
                [editingGateway.id]: hasCommunication
              },
              hasCommunication: m.associatedGateways.some(gw => m.communicationData?.[gw.id])
            } : m
          ));
        } else {
          console.error('Error checking communication');
        }
      }

      setEditingGateway(null);
    }

    setGridRectangles(prevGridRectangles => prevGridRectangles.filter(sector => sector.gateway.id !== editingGateway.id));
  };

  const handleConfirmRemoveMarker = () => {
    setMarkers(prevMarkers => prevMarkers.filter(marker => marker.id !== markerToDelete));
    handleCloseRemoveMarkerModal();
    setFileInfo({
      totalJSONFilesUploaded: fileInfo.totalJSONFilesUploaded,
      totalMarkers: fileInfo.totalMarkers - 1,
      totalGateways: fileInfo.totalGateways,
    });
  };

  const handleConfirmRemoveGateway = () => {
    setGateways(prevGateways => prevGateways.filter(gateway => gateway.id !== gatewayToDelete));
    handleCloseRemoveGatewayModal();
    setFileInfo({
      totalJSONFilesUploaded: fileInfo.totalJSONFilesUploaded,
      totalMarkers: fileInfo.totalMarkers,
      totalGateways: fileInfo.totalGateways - 1,
    });

    setGridRectangles(prevGridRectangles => prevGridRectangles.filter(sector => sector.gateway.id !== gatewayToDelete));
  };

  const handleSaveAltura = (newAltura) => {
    // si editingMarkerId corresponde a un gateway
    if (gateways.find(gateway => gateway.id === editingMarkerId)) {
      setGateways(gateways => gateways.map(gateway =>
        gateway.id === editingMarkerId ? { ...gateway, alturaSuelo: newAltura } : gateway
      ));
    } else {
      setMarkers(markers => markers.map(marker =>
        marker.id === editingMarkerId ? { ...marker, alturaSuelo: newAltura } : marker
      ));
    }
  };

  const handleSaveNombre = (newNombre) => {
    // si editingMarkerId corresponde a un gateway
    if (gateways.find(gateway => gateway.id === editingMarkerId)) {
      setGateways(gateways => gateways.map(gateway =>
        gateway.id === editingMarkerId ? { ...gateway, name: newNombre } : gateway
      ));
    } else {
      setMarkers(markers => markers.map(marker =>
        marker.id === editingMarkerId ? { ...marker, name: newNombre } : marker
      ));
    }
  }

  const handleSaveRssiAndSnr = (newRssi, newSnr) => {
    setMarkers(markers => markers.map(marker =>
      marker.id === editingMarkerId ? { ...marker, rssi: newRssi, snr: newSnr } : marker
    ));
  };

  const handleOpenEditPositionModal = (gatewayId) => {
    setEditingGateway(gateways.find(gateway => gateway.id === gatewayId));
    setShowEditPositionModal(true);
  };

  const gatewayIcon = () => {
    const podcastIcon = ReactDOMServer.renderToString(
      <FontAwesomeIcon icon={faPodcast} style={{
        position: 'absolute',
        top: '32%',
        left: '61%',
        transform: 'translate(-50%, -50%)',
        color: 'black',
        fontSize: '1.5em'
      }} />
    );
    const iconHtml = `
        <div style="position: relative;">
        <img src="/fressim/static/images/gateway-icon.png" style="width: 30px; height: 50px;"/>
        ${podcastIcon}
        </div>
    `;
    return L.divIcon({
      html: iconHtml,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      className: ''
    });
  };

  // Configuración de Leaflet se realiza en el cliente
  useEffect(() => {
    delete Leaflet.Icon.Default.prototype._getIconUrl;
    Leaflet.Icon.Default.mergeOptions({
      iconRetinaUrl: 'leaflet/images/marker-icon-2x.png',
      iconUrl: 'leaflet/images/marker-icon.png',
      shadowUrl: 'leaflet/images/marker-shadow.png',
    });
  }, []);


  // Función para manejar la visibilidad de los gateways
  const toggleGatewayVisibility = (gatewayId, isVisible) => {
    setVisibleGateways(prevVisibleGateways => {
      const newSet = new Set(prevVisibleGateways);
      if (isVisible) {
        newSet.add(gatewayId);
      } else {
        newSet.delete(gatewayId);
      }
      return newSet;
    });
  };

  const MapEventHandler = () => {
    const map = useMapEvent({
      overlayadd: (e) => {
        if (e.name.startsWith('Gateway: ')) {
          const gatewayName = e.name.replace('Gateway: ', '');
          const gateway = gateways.find(g => g.name === gatewayName);
          if (gateway) {
            toggleGatewayVisibility(gateway.id, true);
          }
        }
      },
      overlayremove: (e) => {
        if (e.name.startsWith('Gateway: ')) {
          const gatewayName = e.name.replace('Gateway: ', '');
          const gateway = gateways.find(g => g.name === gatewayName);
          if (gateway) {
            toggleGatewayVisibility(gateway.id, false);
          }
        }
      },
    });
    return null;
  };


  return (
    <MapContainer className={mapClassName} style={{ width, height }} {...rest}>
      <MapEventHandler />
      <LayersControl position="topleft">
          <LayerGroup>
            <BaseLayer checked name="Satellite">
            {"ArcGIS"}
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
              />
            </BaseLayer>
            <BaseLayer name="Topographyc">
            {"Open Topo Map"}
              <TileLayer
                url='https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
                attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
                maxNativeZoom={17}  
              />
            </BaseLayer>
            <BaseLayer name="Greyscale">
            {"Top Plus Open"}
              <TileLayer
                url='http://sgx.geodatenzentrum.de/wmts_topplus_open/tile/1.0.0/web_grau/default/WEBMERCATOR/{z}/{y}/{x}.png'
                attribution='Map data: &copy; <a href="http://www.govdata.de/dl-de/by-2-0">dl-de/by-2-0</a>'
                maxNativeZoom={20}  
              />
            </BaseLayer>
          </LayerGroup>

        <LayersControl.Overlay checked name="Green sectors">
          <LayerGroup>
            {gridRectangles
              .filter(rectangle => rectangle.color === config.colors.fullCommunicationColor)
              .filter(rectangle => visibleGateways.has(rectangle.gateway.id))
              .map((rectangle, index) => (
                <Rectangle
                  key={index}
                  bounds={rectangle.bounds}
                  color={rectangle.color}
                  weight={0}
                  opacity={0.5}
                />
            ))}
          </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Yellow sectors">
          <LayerGroup>
            {gridRectangles
              .filter(rectangle => rectangle.color === config.colors.poorCommunicationColor)
              .filter(rectangle => visibleGateways.has(rectangle.gateway.id))
              .map((rectangle, index) => (
                <Rectangle
                  key={index}
                  bounds={rectangle.bounds}
                  color={rectangle.color}
                  weight={0}
                  opacity={0.5}
                />
            ))}
          </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Red sectors">
          <LayerGroup>
            {gridRectangles
              .filter(rectangle => rectangle.color === config.colors.noCommunicationColor)
              .filter(rectangle => visibleGateways.has(rectangle.gateway.id))
              .map((rectangle, index) => (
                <Rectangle
                  key={index}
                  bounds={rectangle.bounds}
                  color={rectangle.color}
                  weight={0}
                  opacity={0.5}
                />
            ))}
          </LayerGroup>
        </LayersControl.Overlay>

        {gateways.map(gateway => (
          <LayersControl.Overlay 
            key={`${gateway.id}-${gateway.name}`}
            name={`Gateway: ${gateway.name}`}
            checked={visibleGateways.has(gateway.id)}
          >
            <LayerGroup>
              <Marker
                position={[gateway.lat, gateway.lng]}
                icon={gatewayIcon()}
              >
                <Popup>
                  <div style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <div>
                      <font size="+1"><b>{gateway.name}</b></font>
                      <button onClick={() => editNombreModal(gateway.id, gateway.name)} style={{ marginLeft: '10px' }}>
                        <FontAwesomeIcon icon={faPencil} />
                      </button>
                      <hr />
                      <div style={{ marginBottom: '10px' }}>
                        <span><b>Height</b>: {gateway.alt} meters</span>
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <span><b>Ground level</b>: {gateway.alturaSuelo} meters</span>
                        <button onClick={() => editAlturaModal(gateway.id, gateway.alturaSuelo)} style={{ marginLeft: '10px' }}>
                          <FontAwesomeIcon icon={faPencil} />
                        </button>
                      </div>
                      <button className="btn btn-primary" onClick={() => handleOpenEditPositionModal(gateway.id)} style={{ marginRight: '2%' }}>
                        <FontAwesomeIcon icon={faLocationArrow} />
                      </button>
                      
                      <button
                        className="btn btn-primary" onClick={() => handleOpenRadiusGeneratorModal(gateway.id, true)} style={{ marginRight: '2%' }}>
                        <FontAwesomeIcon icon={faSignal}/>
                      </button>

                      <button className="btn btn-danger" onClick={(e) => removeGateway(gateway.id, e)} >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </LayerGroup>
          </LayersControl.Overlay>
        ))}
          
      </LayersControl>

      {/* Button to clear the grid */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
        }}
      >
        <button 
          id="clear-grid-button"
          className="btn btn-secondary"
          onClick={clearGrid} >
          Clear Grid
        </button>
      </div>

      {markers.map(marker => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          icon={Leaflet.icon({
            iconUrl: marker.associatedGateways.some(gw => marker.communicationData?.[gw.id])
              ? '/fressim/static/images/comm-marker-icon.png'
              : '/fressim/static/images/no-comm-marker-icon.png',
            iconRetinaUrl: marker.associatedGateways.some(gw => marker.communicationData?.[gw.id])
              ? '/fressim/static/images/comm-marker-icon.png'
              : '/fressim/static/images/no-comm-marker-icon.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })}
        >
          <Popup>
            <div style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <div>
                <div>
                  <font size="+2"><b>{marker.name}</b></font>
                  <button onClick={() => editNombreModal(marker.id, marker.alturaSuelo)} style={{ marginLeft: '10px' }}>
                    <FontAwesomeIcon icon={faPencil} />
                  </button>
                  <br />
                  <font size="+1"><b>RSSI: {marker.rssi} | SNR: {marker.snr}</b></font>
                  <button onClick={() => editRssiAndSnr(marker.id)} style={{ marginLeft: '10px' }}>
                    <FontAwesomeIcon icon={faPencil} />
                  </button>
                </div>
                <hr />
                <div style={{ marginBottom: '10px' }}>
                  <span><b>Gateways</b>:
                    {marker.associatedGateways.map((gw, index) => (
                      <span key={gw.id} style={{ color: marker.communicationData?.[gw.id] ? 'green' : 'red' }}>
                        {gw.name}{index < marker.associatedGateways.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </span>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <span><b>Height</b>: {marker.alt} meters</span>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <span><b>Ground level</b>: {marker.alturaSuelo} meters</span>
                  <button onClick={() => editAlturaModal(marker.id, marker.alturaSuelo)} style={{ marginLeft: '10px' }}>
                    <FontAwesomeIcon icon={faPencil} />
                  </button>
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenGatewayAssignModal(marker.id)} style={{ marginRight: '2%' }}>
                  <FontAwesomeIcon icon={faPodcast} />
                </button>

                <button className="btn btn-success" onClick={() => handleOpenGraphGeneratorModal(marker.id)} style={{ marginRight: '2%' }}>
                  <FontAwesomeIcon icon={faLineChart} />
                </button>

                <button className="btn btn-danger" onClick={(e) => removeMarker(marker.id, e)} >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
                <hr />
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      <MapEventsHandler />

      <EditAlturaSueloModal
        show={showEditAlturaModal}
        handleClose={handleCloseEditAlturaModal}
        currentAltura={markers.find(marker => marker.id === editingMarkerId)?.alturaSuelo ||
          gateways.find(gateway => gateway.id === editingMarkerId)?.alturaSuelo}
        handleSave={handleSaveAltura}
      />

      <EditNombreModal
        show={showEditNombreModal}
        handleClose={handleCloseEditNombreModal}
        nombreActual={markers.find(marker => marker.id === editingMarkerId)?.name ||
          gateways.find(gateway => gateway.id === editingMarkerId)?.name}
        handleSave={handleSaveNombre}
      />

      <EditRssiAndSnrModal
        show={showEditRssiAndSnrModal}
        handleClose={handleCloseEditRssiAndSnrModal}
        rssiActual={markers.find(marker => marker.id === editingMarkerId)?.rssi}
        snrActual={markers.find(marker => marker.id === editingMarkerId)?.snr}
        handleSave={handleSaveRssiAndSnr}
      />

      <RemoveMarkerModal
        show={showRemoveMarkerModal}
        handleClose={handleCloseRemoveMarkerModal}
        handleConfirm={handleConfirmRemoveMarker}
        markerName={markers.find(marker => marker.id === markerToDelete)?.name || ''}
      />

      <EditPositionModal
        show={showEditPositionModal}
        handleClose={handleCloseEditPositionModal}
        gateway={editingGateway}
        handleSave={handleSavePosition}
      />

      <RemoveGatewayModal
        show={showRemoveGatewayModal}
        handleClose={handleCloseRemoveGatewayModal}
        handleConfirm={handleConfirmRemoveGateway}
        gatewayName={gateways.find(gateway => gateway.id === gatewayToDelete)?.id || ''}
      />

      <LoadingOverlay isLoading={isLoading} />

    </MapContainer>
    
  );
}

export default DynamicMap;