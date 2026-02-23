// components/Modals/GridGeneratorModal.js

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, FormLabel } from 'react-bootstrap';

const GridGeneratorModal = ({ show, handleClose, handleGenerateGrid, config, apiID, generatorMode, elevationPoints }) => {
  
  const [availableRatios, setAvailableRatios] = useState([]);
  const [radius, setRadius] = useState(0);
  const [selectedResolution, setSelectedResolution] = useState(0); 
  const [checkPointsGroundElevation, setCheckPointsGroundElevation] = useState(0);
  const [selectedRatio, setSelectedRatio] = useState([0, 0]);
  const [estimatedRequests, setEstimatedRequests] = useState(0);
  const [selectedElevationPoints, setSelectedElevationPoints] = useState(0);
  const [generatorModes, setGeneratorModes] = useState({});

  useEffect(() => {
    initializeConfig(config);
    updateEstimatedRequests(generatorMode, apiID, radius, selectedResolution, elevationPoints);
  }, [config, generatorMode, apiID, elevationPoints]);

  const initializeConfig = (config) => {
    if (config) {
      const aux = config.availableRatios;
      setAvailableRatios(aux);
      setRadius(aux[0][0]);
      setSelectedResolution(aux[0][1]);
      setSelectedRatio(aux[0]);
      setGeneratorModes(config.generatorModes);
      setCheckPointsGroundElevation(config.defaultNodeGroundElevation);
      setSelectedElevationPoints(config.defaultElevationPoints);
    }
  };

  const updateEstimatedRequests = (generatorMode, apiID, radius, selectedResolution, elevationPoints) => {
    if (generatorMode || apiID) {
      setEstimatedRequests(calculateRequests(radius, selectedResolution));
    }
    if (elevationPoints) {
      setSelectedElevationPoints(elevationPoints);
      setEstimatedRequests(calculateRequests(radius, selectedResolution));
    }
  };

  const handleRatioChange = (ratio) => {
    setSelectedRatio(ratio);
    const [radNum, resNum] = ratio.split(',').map(Number);
    setSelectedResolution(resNum);
    setRadius(radNum);
    setEstimatedRequests(calculateRequests(radNum, resNum));
  };

  const calculateRequests = (radNum, resNum) => {
    let numPoints = 0;
    if (generatorMode === generatorModes.speed) {
      numPoints = ((((radNum / resNum) * 2) + ((radNum / resNum) - 2) * 2) * selectedElevationPoints);
    } else {
      numPoints = (Math.pow((radNum / resNum), 2) * selectedElevationPoints);
    }
    switch (apiID) {
      case config.apiIDs.openMeteo:
        return Math.ceil(numPoints / config.apiPointsBatch.openMeteo);
      case config.apiIDs.google:
        return Math.ceil(numPoints / config.apiPointsBatch.google);
      case config.apiIDs.bing:
        return Math.ceil(numPoints / config.apiPointsBatch.bing);
      case config.apiIDs.openTopo:
        return Math.ceil(numPoints / config.apiPointsBatch.openTopo);
      default:
        alert('Unexpected API ID');
        return 0;
    }
    return 0; // Default return value
  };

  const handleSubmit = () => {
    const gridRadius = parseFloat(radius);
    const gridResolution = parseFloat(selectedResolution);
    const gridElevation = parseFloat(checkPointsGroundElevation);

    if (isNaN(gridRadius)) {
      alert('Please enter a valid radius.');
      return;
    } else if (isNaN(gridResolution) || gridResolution <= 0) {
      alert('Please enter a valid resolution.');
      return;
    } else if (gridResolution > gridRadius) {
      alert('Radius must be greater than resolution.');
      return;
    } else if (isNaN(gridElevation) || gridElevation < 0) {
      alert('Elevation must be greater than 0 and not null.');
      return;
    } else if (!Number.isInteger(gridElevation)) {
      alert('Decimals not permitted on elevation.');
      return;
    }

    handleGenerateGrid(gridRadius, gridResolution, gridElevation, selectedElevationPoints);
    handleClose();
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Coverage Map</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
        <div style={{ display: 'flex', gap: '50px', justifyContent: 'space-between', marginRight: '5%' }}>
          <div>
            Node's ground elevation:
          </div>
          <Form.Group controlId="checkPointsGroundElevation" style={{ width: '150px' }}>
            <Form.Control
              type="number"
              step={1}
              value={checkPointsGroundElevation}
              onChange={(e) => setCheckPointsGroundElevation(e.target.value)}
            />
          </Form.Group>
        </div>

        <div style={{ display: 'flex', gap: '50px', justifyContent: 'space-between', marginRight: '5%' }}>
          <div>
          Scale ratio (diameter, resolution):
          </div>

          <Form.Group className="gridRatio" style={{ width: '150px' }}>
            <Form.Control 
              as="select" 
              value={selectedRatio}
              onChange={(e) => handleRatioChange(e.target.value)}
            >
              {availableRatios.map((ratioOption) => (
                <option 
                  key={ratioOption} 
                  value={ratioOption}
                >
                  {`${ratioOption[0]/1000}km, ${ratioOption[1]}m`}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        </div>

        {(generatorMode === generatorModes.speed) && (
          <div style={{ display: 'flex', gap: '50px', justifyContent: 'space-between', marginRight: '5%' }}>
            <div>
              Elevation points:
            </div>
            <Form.Group controlId="elevationPointsInput" style={{ width: '150px' }}>
              <Form.Control
                type="number"
                step={1}
                value={selectedElevationPoints}
                onChange={(e) => setSelectedElevationPoints(e.target.value)}
              />
            </Form.Group>
          </div>
        )}

        </Form>
        <div style={{ display: 'flex', gap: '100px'}}>
          <div>
            Estimated requests numbrer: 
          </div>
          <FormLabel>{estimatedRequests}</FormLabel>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handleSubmit}>
          Generate
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default GridGeneratorModal;
