import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const EditAlturaSueloModal = ({ show, handleClose, currentAltura, handleSave }) => {
    const [nuevaAltura, setNuevaAltura] = useState('');

    // Actualizar nuevoNombre cuando nombreActual cambia
    useEffect(() => {
        if (currentAltura) {
            setNuevaAltura(currentAltura);
        }
    }, [currentAltura]);

    const handleAlturaChange = (event) => {
        setNuevaAltura(event.target.value);
    };

    const handleSubmit = () => {
        if (nuevaAltura >= 0) {
            handleSave(parseFloat(nuevaAltura));
            handleClose();
        } else {
            alert("Please enter a valid number greater than or equal to 0.");
        }
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Edit Height Above Ground</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group controlId="alturaSuelo">
                        <Form.Label>New Height (meters):</Form.Label>
                        <Form.Control
                            type="number"
                            value={nuevaAltura}
                            onChange={handleAlturaChange}
                            min={0}
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

export default EditAlturaSueloModal;