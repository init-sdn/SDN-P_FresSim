import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const GraphGeneratorModal = ({ show, handleClose, assignedGateways, handleShowGraph }) => {
    const [selectedGateways, setSelectedGateways] = useState([]);
    const [minAltitude, setMinAltitude] = useState(0);
    const [maxAltitude, setMaxAltitude] = useState(0);

    useEffect(() => {
        if (show) {
            setSelectedGateways(assignedGateways.map(gateway => gateway.id));
            setMinAltitude(0.0);
            setMaxAltitude(0.0);
        }
    }, [show, assignedGateways]);

    const handleGatewayToggle = (gatewayId) => {
        setSelectedGateways(prev => {
            if (prev.includes(gatewayId)) {
                return prev.filter(id => id !== gatewayId);
            } else {
                return [...prev, gatewayId];
            }
        });
    };

    const handleSubmit = () => {
        if (selectedGateways.length === 0) {
            alert("You must select at least one gateway.");
            return;
        }
        handleShowGraph(selectedGateways, minAltitude, maxAltitude);
        handleClose();
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Generate Graph</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    {assignedGateways.map(gateway => (
                        <Form.Check
                            type="checkbox"
                            id={`gateway-${gateway.id}`}
                            label={gateway.name}
                            checked={selectedGateways.includes(gateway.id)}
                            onChange={() => handleGatewayToggle(gateway.id)}
                            key={gateway.id}
                        />
                    ))}
                    <Form.Group className="mb-3">
                        <Form.Label>Minimum Altitude (optional)</Form.Label>
                        <Form.Control
                            type="number"
                            value={minAltitude}
                            onChange={e => setMinAltitude(parseFloat(e.target.value))}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Maximum Altitude (optional)</Form.Label>
                        <Form.Control
                            type="number"
                            value={maxAltitude}
                            onChange={e => setMaxAltitude(parseFloat(e.target.value))}
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" onClick={handleSubmit}>Generate</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default GraphGeneratorModal;