// components/Modals/ModeSelectorModal.js

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';


const ModeSelectorModal = ({ show, handleClose, handleChangeMode, config }) => {
  const [availableModes, setAvailableModes] = useState([]);
  const [selectedMode, setSelectedMode] = useState(null);

  useEffect(() => {
    if (config) {
      setAvailableModes(config.availableModes);
      setSelectedMode(availableModes[0]);
    }
  }, [config]);

  const handleModeChange = (mode) => {
    setSelectedMode(mode);
  };

  const handleSubmit = () => {

    if (!selectedMode) {
      alert('Please select a mode.');
      return;
    }

    handleChangeMode(selectedMode);
    handleClose();
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Grid generator mode</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Label><strong>· Speed mode:</strong> reduces generation time and API requests at the expense of reduced accuracy in the results. Low error rate in areas of up to 10 km.  </Form.Label>
        <Form.Label><strong>· Precision mode:</strong> increases accuracy at the expense of a much larger number of API requests.</Form.Label>
        <br />
        <br />
        <Form>
          <Form.Group className="modeSelector">
            <Form.Label><strong>Select Mode:</strong></Form.Label>
            {availableModes.map((mode) => (
              <Form.Check
                key={mode}
                type="radio"
                label={`${mode.charAt(0).toUpperCase() + mode.slice(1)}`}
                name="mode"
                value={mode}
                checked={selectedMode === mode}
                onChange={(e) => handleModeChange(e.target.value)}
              />
            ))}
          </Form.Group>
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

export default ModeSelectorModal;