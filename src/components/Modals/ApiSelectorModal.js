// components/Modals/ApiSelectorModal.js

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';


const ApiSelectorModal = ({ show, handleClose, handleChangeAPI, config }) => {
  const [availableApis, setAvailableApis] = useState([]);
  const [selectedAPI, setSelectedAPI] = useState(availableApis[0]);
  const [googleAPIKey, setGoogleAPIKey] = useState('');
  const [bingAPIKey, setBingAPIKey] = useState('');
  const [googleApiId, setGoogleApiId] = useState('');
  const [bingApiId, setBingApiId] = useState('');


  useEffect(() => {
    if (config) {
      setAvailableApis(config.availableAPIs);
      setBingApiId(config.apiIDs.bing);
      setGoogleApiId(config.apiIDs.google);
    }
  }, [config]);


  const handleAPIChange = (api) => {
    setSelectedAPI(api);
  };


  const handleKeyChange = (key) => {
    switch (selectedAPI) {
      case config.apiIDs.google:
        setGoogleAPIKey(key);
        break;
      case config.apiIDs.bing:
        setBingAPIKey(key);
        break;
    }
  };


  const handleSubmit = () => {

    if (!selectedAPI) {
      alert('Please select an API.');
      return;
    }

    if (!googleAPIKey && selectedAPI === config.apiIDs.google) {
      alert('Please provide a Google API Key.');
      return;
    }

    if (!bingAPIKey && selectedAPI === config.apiIDs.bing) {
      alert('Please provide a Bing API Key.');
      return;
    }


    handleChangeAPI(selectedAPI, googleAPIKey, bingAPIKey);
    handleClose();
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Elevation API configuration</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="apiSelector">
            <Form.Label><strong>Select API:</strong></Form.Label>
            <Form.Control 
              as="select" 
              value={selectedAPI} 
              onChange={(e) => handleAPIChange(e.target.value)}
            >
              {availableApis.map((api) => (
                <option 
                  key={api} 
                  value={api}
                >
                  {`${api.charAt(0).toUpperCase() + api.slice(1)}`}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
          
          <br />

          {(selectedAPI === googleApiId) && (
          <Form.Group className="apiKeyInput">
            <Form.Label><strong>API Key:</strong></Form.Label>
            <Form.Control 
              type="text"
              value={googleAPIKey}
              onChange={(e) => handleKeyChange(e.target.value)}
            />
          </Form.Group>
          )}
          {(selectedAPI === bingApiId) && (
          <Form.Group className="apiKeyInput">
            <Form.Label><strong>API Key:</strong></Form.Label>
            <Form.Control 
              type="text"
              value={bingAPIKey}
              onChange={(e) => handleKeyChange(e.target.value)}
            />
          </Form.Group>
          )}
          
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handleSubmit}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ApiSelectorModal;