import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '@components/Layout';
import Section from '@components/Section';
import Container from '@components/Container';
import Map from '@components/Map';
import DataLoader from '@components/DataLoader/DataLoader';
import DataInfo from '@components/DataInfo/DataInfo';
import GridGeneratorModal from '@components/Modals/GridGeneratorModal';
import ApiSelectorModal from '@components/Modals/ApiSelectorModal';
import ModeSelectorModal from '@components/Modals/ModeSelectorModal';
import DeleteAllConfirmationModal from '@components/Modals/DeleteAllConfirmationModal';
import AssignGatewaysModal from '@components/Modals/AssignGatewaysModal';
import GraphGeneratorModal from '@components/Modals/GraphGeneratorModal';


import Graph from '@components/Graph/Graph';
import dynamic from 'next/dynamic';
const DynamicMapComponent = dynamic(() => import('@components/Map'), {
  ssr: false,
});


import styles from '@styles/Home.module.scss';
import '@fortawesome/fontawesome-svg-core/styles.css'


const DEFAULT_CENTER = [40.35157, -1.10920];

export default function Home() {
  const [globalConfigurations, setGlobalConfigurations] = useState(null);

  useEffect(() => {
    const fetchGlobalConfigurations = async () => {
      const configurations = await importGlobalConfigurations();
      setGlobalConfigurations(configurations);
    };

    fetchGlobalConfigurations();
  }, []);

  const [jsonLoaded, setJsonLoaded] = useState(false);
  const [fileInfo, setFileInfo] = useState({
    totalJSONFilesUploaded: 0,
    totalMarkers: 0,
    totalGateways: 0,
  });

  const [markers, setMarkers] = useState([]);
  const [gateways, setGateways] = useState([]);

  const [assignedGatewaysForModal, setAssignedGatewaysForModal] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [showAssignGatewaysModal, setShowAssignGatewaysModal] = useState(false);
  const [showGraphGeneratorModal, setShowGraphGeneratorModal] = useState(false);
  const [gridGatewayCoordinates, setGridGatewayCoordinates] = useState(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);

  const [showGraphComponentModal, setShowGraphComponentModal] = useState(false);
  const [showGridGeneratorModal, setShowGridGeneratorModal] = useState(false);
  const [selectedGridEntity, setSelectedGridEntity] = useState(null);
  const [gridParameters, setGridParameters] = useState(null);
 
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [selectedGateways, setSelectedGateways] = useState([]);
  const [selectedMinAltitude, setSelectedMinAltitude] = useState(0);
  const [selectedMaxAltitude, setSelectedMaxAltitude] = useState(0);

  const [selectedApiID, setSelectedApiID] = useState('');
  const [apiKeyBing, setApiKeyBing] = useState('');
  const [apiKeyGoogle, setApiKeyGoogle] = useState('');
  const [showApiSelectorModal, setShowApiSelectorModal] = useState(false);

  const [generatorMode, setGeneratorMode] = useState('');
  const [showModeSelectorModal, setShowModeSelectorModal] = useState(false);

  const [elevationPoints, setElevationPoints] = useState(0);

  
  useEffect(() => {
    if (globalConfigurations) {
      setSelectedApiID(globalConfigurations.availableAPIs[0]);
      setGeneratorMode(globalConfigurations.availableModes[0]);
      setElevationPoints(globalConfigurations.defaultElevationPoints);
    }
  }, [globalConfigurations]);

  
  // Makes a request to the server to get the global configurations
  const importGlobalConfigurations = async () => {
    const id = 'client';
    try {
      const response = await fetch('/fressim/api/export-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.configurations;

      } else {
        console.error('Error fetching configurations from server');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };


  const exportDataToJson = () => {
    // Encuentra nombres duplicados entre los gateways
    const gatewayNames = gateways.map(gateway => gateway.name);
    const duplicates = gatewayNames.filter((name, index) => gatewayNames.indexOf(name) !== index);

    // Si hay duplicados, muestra una alerta
    if (new Set(duplicates).size > 0) {
      window.alert(`There are gateways with duplicate names. Please rename them before exporting the data.`);
      return;
    }

    // Transforma los marcadores al formato deseado
    const transformedData = markers.map(marker => {
      return {
        deviceInfo: {
          deviceName: marker.name
        },
        rxInfo: marker.associatedGateways.map(gw => ({
          name: gw.name,
          rssi: marker.rssi,
          snr: marker.snr,
          gatewayId: gw.gatewayId,
          location: {
            latitude: gw.lat,
            longitude: gw.lng,
            altitude: gw.alt,
            alturaSuelo: gw.alturaSuelo,
          }
        })),
        object: {
          gpsLocation: {
            "1": {
              altitude: marker.alt,
              latitude: marker.lat,
              longitude: marker.lng,
              alturaSuelo: marker.alturaSuelo
            }
          }
        }
      };
    });

    const dataStr = JSON.stringify(transformedData, null, 2); // Formatea el JSON
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = 'markers_data.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleOpenDeleteConfirmationModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleOpenGatewayAssignModal = (markerId) => {
    setSelectedMarkerId(markerId);
    setShowAssignGatewaysModal(true);
  };

  const handleOpenGraphGeneratorModal = (markerId) => {
    const selectedMarker = markers.find(marker => marker.id === markerId);
    if (selectedMarker && !selectedMarker.isGateway) {
      setAssignedGatewaysForModal(selectedMarker.associatedGateways);
      setSelectedMarker(selectedMarker);
      setShowGraphGeneratorModal(true);
    }
  };

  const handleOpenRadiusGeneratorModal = (id, isGateway = false) => {
    let selectedEntity;
    if (isGateway) {
      selectedEntity = gateways.find((gateway) => gateway.id === id);
    } else {
      selectedEntity = markers.find((marker) => marker.id === id);
    }
  
    if (selectedEntity) {
      setSelectedGridEntity(selectedEntity);
      setShowGridGeneratorModal(true);
    }
  };

  const handleGenerateGrid = (gridRadius, gridResolution, checkPointsGroundElevation, selectedElevationPoints) => {
    if (selectedGridEntity) {
      setGridParameters({
        gateway: selectedGridEntity,
        radius: gridRadius,
        resolution: gridResolution,
        checkPointsGroundElevation: checkPointsGroundElevation,
        elevationPoints: selectedElevationPoints,
      });
    }
    setElevationPoints(selectedElevationPoints);
    setShowGridGeneratorModal(false);
  };

  const handleChangeAPI = (apiID, apiKeyGoogle, apiKeyBing) => {
    setSelectedApiID(apiID);
    setApiKeyBing(apiKeyBing);
    setApiKeyGoogle(apiKeyGoogle);

    setShowApiSelectorModal(false);
  }

  const handleChangeMode = (mode) => {
    setGeneratorMode(mode);

    setShowModeSelectorModal(false);
  }
  

  const handleShowGraph = (selectedGateways, minAltitude, maxAltitude) => {
    setSelectedGateways(selectedGateways); // Almacena los gateways seleccionados
    setSelectedMinAltitude(minAltitude); // Almacena la altitud mínima
    setSelectedMaxAltitude(maxAltitude); // Almacena la altitud máxima
    setShowGraphComponentModal(true);
    setShowGraphGeneratorModal(false); // Cierra el modal GraphGeneratorModal
  };


  const handleConfirmDelete = () => {
    setMarkers([]);
    setGateways([]);
    setFileInfo({
      totalJSONFilesUploaded: 0,
      totalMarkers: 0,
      totalGateways: 0,
    });
    setJsonLoaded(false);
      {globalConfigurations && (
        <div>
          {/* Render something with globalConfigurations if needed */}
        </div>
      )}
    handleCloseModal();
  };

  return (
    <Layout>
      <Head>
        <title>FresSim</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Section>
        <Container>
        <div className="sub-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginLeft: '10%', width: '80%', marginTop: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '50px' }}> 
            <div>
              <strong>Elevation data from:</strong> {selectedApiID.charAt(0).toUpperCase() + selectedApiID.slice(1)}
            </div>
          <div style={{ display: 'flex', gap: '15px' }}>
              <button className="btn btn-primary" onClick={() => setShowApiSelectorModal(true)}>
                  API Selector
              </button>
              <button className="btn btn-primary" onClick={() => setShowModeSelectorModal(true)}>
                  Mode Selector
              </button>
            </div>
          </div>

          <div>
              {/* DataLoader se muestra solo si jsonLoaded es false */}
              {!jsonLoaded && (
                  <DataLoader
                      setJsonLoaded={setJsonLoaded}
                      setFileInfo={setFileInfo}
                      setMarkers={setMarkers}
                      setGateways={setGateways}
                      apiID={selectedApiID}
                      apiKeys={{ bing: apiKeyBing, google: apiKeyGoogle }}
                  />
              )}
          </div>
        </div>

          
          <DynamicMapComponent
            markers={markers}
            gateways={gateways}
            setMarkers={setMarkers}
            setGateways={setGateways}
            fileInfo={fileInfo}
            setFileInfo={setFileInfo}
            handleOpenGatewayAssignModal={handleOpenGatewayAssignModal}
            handleOpenGraphGeneratorModal={handleOpenGraphGeneratorModal}
            handleOpenRadiusGeneratorModal={handleOpenRadiusGeneratorModal}
            setJsonLoaded={setJsonLoaded}
            className={styles.homeMap}
            width="800"
            height="700"
            center={DEFAULT_CENTER}
            zoom={13}
            fullscreenControl={true}
            gridGatewayCoordinates={gridGatewayCoordinates}
            gridParameters={gridParameters}
            apiID={selectedApiID}
            apiKeys={{ bing: apiKeyBing, google: apiKeyGoogle }}
            generatorMode={generatorMode}
            config={globalConfigurations}
          />


          {/* DataInfo se muestra solo si jsonLoaded es true */}
          {jsonLoaded && (
            <DataInfo
              totalJSONFilesUploaded={fileInfo.totalJSONFilesUploaded}
              totalMarkers={fileInfo.totalMarkers}
              totalGateways={fileInfo.totalGateways}
              exportDataToJson={exportDataToJson}
              handleOpenDeleteConfirmationModal={handleOpenDeleteConfirmationModal}
            />
          )}
        </Container>

      </Section>
      <AssignGatewaysModal
        show={showAssignGatewaysModal}
        handleClose={() => setShowAssignGatewaysModal(false)} // Función para cerrar el modal
        markers={markers}
        selectedMarkerId={selectedMarkerId}
        setMarkers={setMarkers}
        gateways={gateways} // Todos los gateways disponibles
        selectedGateways={markers.find(marker => marker.id === selectedMarkerId)?.associatedGateways}
        handleAssign={(assignedGateways) => {
          // Lógica para actualizar el estado de los marcadores con los gateways asignados
          setMarkers(prevMarkers => prevMarkers.map(marker =>
            marker.id === selectedMarkerId ? { ...marker, associatedGateways: assignedGateways } : marker
          ));
        }}
        apiID={selectedApiID}
        apiKeys={{ bing: apiKeyBing, google: apiKeyGoogle }}
      />

      <GraphGeneratorModal
        show={showGraphGeneratorModal}
        handleClose={() => setShowGraphGeneratorModal(false)}
        assignedGateways={assignedGatewaysForModal}
        handleShowGraph={handleShowGraph}
        showGraphComponentModal={showGraphComponentModal}
        setShowGraphComponentModal={setShowGraphComponentModal}
      />

      <Graph
        show={showGraphComponentModal}
        handleClose={() => setShowGraphComponentModal(false)}
        selectedGateways={selectedGateways.map(gatewayId =>
          gateways.find(g => g.id === gatewayId)
        )}
        openedMarker={selectedMarker}
        minAltitude={selectedMinAltitude}
        maxAltitude={selectedMaxAltitude}
        apiID={selectedApiID}
        apiKeys={{ bing: apiKeyBing, google: apiKeyGoogle }}
      />

      <GridGeneratorModal
        show={showGridGeneratorModal}
        handleClose={() => setShowGridGeneratorModal(false)}
        handleGenerateGrid={handleGenerateGrid}
        config = {globalConfigurations}
        apiID={selectedApiID}
        generatorMode={generatorMode}
        elevationPoints={elevationPoints}
      />

      <DeleteAllConfirmationModal
        show={showModal}
        handleClose={handleCloseModal}
        handleConfirm={handleConfirmDelete}
      />

      <ApiSelectorModal
        show={showApiSelectorModal}
        handleClose={() => setShowApiSelectorModal(false)}
        handleChangeAPI={handleChangeAPI}
        config={globalConfigurations}
      />

      <ModeSelectorModal
        show={showModeSelectorModal}
        handleClose={() => setShowModeSelectorModal(false)}
        handleChangeMode={handleChangeMode}
        config={globalConfigurations}
      />
    </Layout >
  );
}