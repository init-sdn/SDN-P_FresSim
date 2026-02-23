import React from 'react';
import { Modal, Spinner } from 'react-bootstrap';

const LoadingOverlay = ({ isLoading }) => {
    if (!isLoading) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.9)', // Fondo semi-transparente
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1001 // Se asegura que esté por encima de otros elementos
            }}
        >
            <Modal show={isLoading} backdrop="static" keyboard={false} centered>
                <Modal.Body
                    className="d-flex flex-column justify-content-center align-items-center"
                >
                    <Spinner animation="border" role="status">
                        <span className="sr-only">Loading...</span>
                    </Spinner>
                    <span className="mt-2">Processing data...</span>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default LoadingOverlay;