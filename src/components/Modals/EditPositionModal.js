import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const EditPositionModal = ({ show, handleClose, gateway, handleSave }) => {
    const [newLat, setNewLat] = useState('');
    const [newLng, setNewLng] = useState('');

    useEffect(() => {
        // Actualizar los estados cuando gateway cambie
        if (gateway) {
            setNewLat(gateway.lat);
            setNewLng(gateway.lng);
        }
    }, [gateway]);

    const handleLatChange = (event) => {
        setNewLat(event.target.value);
    };

    const handleLngChange = (event) => {
        setNewLng(event.target.value);
    };

    const handleSubmit = () => {
        // Validación básica de latitud y longitud
        if (isValidLatitude(newLat) && isValidLongitude(newLng)) {
            handleSave([parseFloat(newLat), parseFloat(newLng)]);
            handleClose();
        } else {
            alert('Please enter valid latitude and longitude values.');
        }
    };

    // Funciones de validación (puedes ajustarlas según tus necesidades)
    const isValidLatitude = (lat) => {
        const latNum = parseFloat(lat);
        return !isNaN(latNum) && latNum >= -90 && latNum <= 90;
    };

    const isValidLongitude = (lng) => {
        const lngNum = parseFloat(lng);
        return !isNaN(lngNum) && lngNum >= -180 && lngNum <= 180;
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Edit Position</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group controlId="latitud">
                        <Form.Label>Latitude:</Form.Label>
                        <Form.Control type="number" value={newLat} onChange={handleLatChange} />
                    </Form.Group>
                    <Form.Group controlId="longitud">
                        <Form.Label>Longitude:</Form.Label>
                        <Form.Control type="number" value={newLng} onChange={handleLngChange} />
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

export default EditPositionModal;