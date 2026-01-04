import React from 'react';

const Loader = () => {
    return (
        <div className="d-flex justify-content-center align-items-center py-5">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <span className="ms-2 text-muted fw-bold">Loading Data...</span>
        </div>
    );
};

export default Loader;
