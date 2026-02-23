const DataInfo = ({ totalJSONFilesUploaded, totalMarkers, totalGateways, exportDataToJson, handleOpenDeleteConfirmationModal }) => {
    return (
        <div className="container">
            <div className="row justify-content-center">
                <div className="col-12 col-md-8">
                    <div className="card mt-4">
                        <div className="card-header text-center">INFORMATION</div>
                        <div className="card-body d-flex flex-column align-items-center"> {/* Aplicamos flexbox y centrado vertical */}
                            <div className="d-flex justify-content-center flex-wrap"> {/* Centramos horizontalmente los elementos de información */}
                                <div className="p-2">
                                    <strong>Files:</strong> {totalJSONFilesUploaded}
                                </div>
                                <div className="p-2">
                                    <strong>Points:</strong> {totalMarkers}
                                </div>
                                <div className="p-2">
                                    <strong>Gateways:</strong> {totalGateways}
                                </div>
                            </div>
                            <div className="p-2 mt-2 text-align: center">
                                <button onClick={exportDataToJson} className="btn btn-primary" style={{ marginRight: '10px' }}>
                                    Export JSON
                                </button>
                                <button onClick={handleOpenDeleteConfirmationModal} className="btn btn-danger">
                                    Delete Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataInfo;