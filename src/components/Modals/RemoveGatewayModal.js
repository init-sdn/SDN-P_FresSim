// components/RemoveGatewayModal.js
import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const RemoveGatewayModal = ({ show, handleClose, handleConfirm, gatewayName }) => {
    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Confirm gateway removal</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                Are you sure you want to remove the gateway "{gatewayName}"?
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

export default RemoveGatewayModal;