import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const StaffLayout = () => {
    const navigate = useNavigate();
    const userName = localStorage.getItem('user_name') || 'Staff Member';

    const logout = () => {
        localStorage.clear();
        navigate('/');
        toast.info("Logged out");
    };

    return (
        <div className="d-flex flex-column vh-100 bg-light">
            {/* Top Navbar */}
            <nav className="navbar navbar-dark bg-primary px-3 shadow-sm">
                <span className="navbar-brand mb-0 h1">SubhAuto Staff</span>
                <button onClick={logout} className="btn btn-sm btn-light text-primary fw-bold">Logout</button>
            </nav>

            {/* Welcome Bar */}
            <div className="bg-white px-3 py-2 border-bottom d-flex justify-content-between align-items-center">
                <small className="text-muted">Welcome, <strong>{userName}</strong></small>
                <small className="text-muted">{new Date().toLocaleDateString()}</small>
            </div>

            {/* Main Content */}
            <div className="flex-grow-1 overflow-auto p-3">
                <Outlet />
            </div>
        </div>
    );
};

export default StaffLayout;
