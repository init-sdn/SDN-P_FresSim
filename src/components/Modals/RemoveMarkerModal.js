// components/RemoveMarkerModal.js
import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const RemoveMarkerModal = ({ show, handleClose, handleConfirm, markerName }) => {
    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Confirm marker removal</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                Are you sure you want to remove the marker "{markerName}"?
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Cancel
                </Button>
                <Button variant="danger" onClick={handleConfirm}>
                    Delete
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default RemoveMarkerModal;