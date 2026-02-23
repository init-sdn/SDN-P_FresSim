import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const EditNombreModal = ({ show, handleClose, nombreActual, handleSave }) => {
    const [nuevoNombre, setNuevoNombre] = useState('');

    // Actualizar nuevoNombre cuando nombreActual cambia
    useEffect(() => {
        if (nombreActual) {
            setNuevoNombre(nombreActual);
        }
    }, [nombreActual]);

    const handleNameChange = (event) => {
        setNuevoNombre(event.target.value);
    };

    const handleSubmit = () => {
        if (nuevoNombre !== '') {
            handleSave(nuevoNombre);
            handleClose();
        } else {
            alert("Please enter a valid name.");
        }
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Edit Name</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group controlId="name">
                        <Form.Label>New name:</Form.Label>
                        <Form.Control
                            type="text"
                            value={nuevoNombre}
                            onChange={handleNameChange}
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

export default EditNombreModal;