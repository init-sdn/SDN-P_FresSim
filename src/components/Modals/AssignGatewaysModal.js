// components/RemoveGatewayModal.js
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const AssignGatewaysModal = ({ show, handleClose, markers, selectedMarkerId, setMarkers, gateways, selectedGateways, handleAssign, apiID, apiKeys }) => {

    const [selectedGatewaysState, setSelectedGatewaysState] = useState([...gateways]);


    // Este efecto se ejecuta cada vez que show cambia.
    useEffect(() => {
        if (show) {
            setSelectedGatewaysState(selectedGateways.length > 0 ? selectedGateways : [...gateways]);
        }
    }, [show, selectedGateways, gateways]);

    const handleGatewayToggle = (gateway) => {
        setSelectedGatewaysState(prev => {
            if (prev.some(gw => gw.id === gateway.id)) {
                return prev.filter(gw => gw.id !== gateway.id);
            } else {
                return [...prev, gateway];
            }
        });
    };

    const handleSubmit = async () => {
        handleAssign(selectedGatewaysState);

        // Se obtiene el marcador que se está editando
        const marker = markers.find(m => m.id === selectedMarkerId);

        // Verificar la comunicación para cada gateway seleccionado
        for (const gateway of selectedGatewaysState) {
            const response = await fetch('/fressim/api/check-communication', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ marker, gateway, apiID, apiKeys }),
            });

            if (response.ok) {
                const result = await response.json();
                const hasCommunication = result.hasCommunication;

                // Actualizar communicationData en el marcador
                setMarkers(prevMarkers => prevMarkers.map(m =>
                    m.id === marker.id ? {
                        ...m,
                        communicationData: {
                            ...m.communicationData,
                            [gateway.id]: hasCommunication
                        },
                        hasCommunication: m.associatedGateways.some(gw => m.communicationData?.[gw.id]) // Actualizar hasCommunication
                    } : m
                ));
            } else {
                console.error('Error checking communication');
            }
        }

        setMarkers(prevMarkers => [...prevMarkers]);

        handleClose();
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Assign Gateways</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    {gateways.map(gw => (
                        <Form.Check
                            type="checkbox"
                            checked={selectedGatewaysState.some(selectedGW => selectedGW.id === gw.id)}
                            onChange={() => handleGatewayToggle(gw)}
                            id={`gateway-${gw.id}`}
                            label={gw.name}
                            key={gw.id}
                        />
                    ))}
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" onClick={handleSubmit}>Assign</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default AssignGatewaysModal;