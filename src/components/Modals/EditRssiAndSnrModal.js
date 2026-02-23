import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const EditRssiAndSnrModal = ({ show, handleClose, rssiActual, snrActual, handleSave }) => {
    const [nuevoRssi, setNuevoRssi] = useState(rssiActual || '');
    const [nuevoSnr, setNuevoSnr] = useState(snrActual || '');

    // Actualiza el estado inicial cuando el modal se abre o los valores actuales cambian
    useEffect(() => {
        setNuevoRssi(rssiActual || '');
        setNuevoSnr(snrActual || '');
    }, [show, rssiActual, snrActual]);

    const handleRssiChange = (event) => {
        setNuevoRssi(event.target.value);
    };

    const handleSnrChange = (event) => {
        setNuevoSnr(event.target.value);
    };

    const handleSubmit = () => {
        if (nuevoRssi !== '' && nuevoSnr !== '' && !isNaN(nuevoRssi) && !isNaN(nuevoSnr)) {
            handleSave(parseFloat(nuevoRssi), parseFloat(nuevoSnr));
            handleClose();
        } else {
            alert("Please enter valid numbers.");
        }
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Edit RSSI and SNR</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group controlId="rssi">
                        <Form.Label>RSSI:</Form.Label>
                        <Form.Control
                            type="number"
                            value={nuevoRssi}
                            onChange={handleRssiChange}
                        />
                    </Form.Group>
                    <Form.Group controlId="snr">
                        <Form.Label>SNR:</Form.Label>
                        <Form.Control
                            type="number"
                            value={nuevoSnr}
                            onChange={handleSnrChange}
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={handleSubmit}>
                    Save
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default EditRssiAndSnrModal;