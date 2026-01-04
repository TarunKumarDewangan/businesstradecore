import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const RetailerLayout = () => {
    const navigate = useNavigate();
    const userName = localStorage.getItem('user_name') || 'Retailer';

    const logout = () => {
        localStorage.clear();
        navigate('/');
        toast.info("Logged out");
    };

    return (
        <div className="d-flex flex-column vh-100 bg-light">
            {/* Navbar */}
            <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-3 shadow-sm">
                <div className="container-fluid">
                    <span className="navbar-brand fw-bold text-warning">SubhAuto B2B</span>

                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span className="navbar-toggler-icon"></span>
                    </button>

                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav me-auto">
                            <li className="nav-item">
                                <NavLink to="/retailer/catalog" className={({isActive}) => `nav-link ${isActive ? 'active fw-bold' : ''}`}>
                                    🛒 Catalog
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink to="/retailer/orders" className={({isActive}) => `nav-link ${isActive ? 'active fw-bold' : ''}`}>
                                    📦 My Orders
                                </NavLink>
                            </li>
                            {/* We will add Khata later */}
                        </ul>
                        <div className="d-flex align-items-center gap-3">
                            <span className="text-white-50 small d-none d-md-block">Welcome, {userName}</span>
                            <button onClick={logout} className="btn btn-sm btn-outline-danger">Logout</button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="flex-grow-1 overflow-auto p-3">
                <div className="container">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default RetailerLayout;
