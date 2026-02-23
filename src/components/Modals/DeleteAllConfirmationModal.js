import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const DeleteAllConfirmationModal = ({ show, handleClose, handleConfirm }) => {
    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Delete Confirmation</Modal.Title>
            </Modal.Header>
            <Modal.Body>Are you sure you want to delete all map data?</Modal.Body>
            <Modal.Footer>
                <Button className="btn btn-danger" onClick={handleConfirm}>Confirm</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default DeleteAllConfirmationModal;