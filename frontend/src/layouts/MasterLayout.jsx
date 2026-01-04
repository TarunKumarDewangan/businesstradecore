import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Offcanvas, Button, Badge } from 'react-bootstrap';
import api from '../api/axios';

const MasterLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const userName = localStorage.getItem('user_name') || 'Shop Owner';
    const [counts, setCounts] = useState({ orders: 0, returns: 0 });

    const handleClose = () => setShowMobileMenu(false);
    const handleShow = () => setShowMobileMenu(true);

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await api.get('/dashboard/counts', { headers: { Authorization: `Bearer ${token}` } });
                if(res.data.status) {
                    setCounts({ orders: res.data.orders, returns: res.data.returns });
                }
            } catch(e) { console.error(e); }
        };
        fetchCounts();
    }, [location.pathname]);

    const logout = () => {
        localStorage.clear();
        navigate('/');
        toast.info("Logged out");
    };

    // The Menu Content (Reusable)
    const SidebarContent = ({ isMobile }) => (
        <div className="d-flex flex-column h-100">
            {/* Header (Only show in Desktop, Mobile has its own header) */}
            {!isMobile && (
                <h4 className="mb-0 text-center text-warning fw-bold py-3 border-bottom border-secondary">
                    SubhAuto
                </h4>
            )}

            {/* SCROLLABLE LINKS AREA */}
            <div className="flex-grow-1 overflow-auto px-2 py-3" style={{ scrollbarWidth: 'thin' }}>
                <div className="nav flex-column gap-2">
                    <NavLink to="/master/home" onClick={handleClose} className={({ isActive }) => `btn w-100 text-start border-0 ${isActive ? 'btn-light text-primary fw-bold' : 'btn-outline-light text-white-50'}`}>
                        🏠 DASHBOARD
                    </NavLink>

                    <small className="text-muted mt-3 ms-2 fw-bold text-uppercase" style={{fontSize: '0.7rem'}}>Inventory</small>
                    <NavLink to="/master/items" onClick={handleClose} className={({ isActive }) => `btn w-100 text-start border-0 ${isActive ? 'btn-primary text-white' : 'btn-outline-light'}`}>
                        📦 ITEMS (STOCK)
                    </NavLink>
                    <NavLink to="/master/categories" onClick={handleClose} className={({ isActive }) => `btn w-100 text-start border-0 ${isActive ? 'btn-primary text-white' : 'btn-outline-light'}`}>
                        📂 CATEGORIES
                    </NavLink>
                    <NavLink to="/master/locations" onClick={handleClose} className={({ isActive }) => `btn w-100 text-start border-0 ${isActive ? 'btn-primary text-white' : 'btn-outline-light'}`}>
                        📍 LOCATIONS
                    </NavLink>

                    <small className="text-muted mt-3 ms-2 fw-bold text-uppercase" style={{fontSize: '0.7rem'}}>Sales & Ops</small>
                    <NavLink to="/master/billing" onClick={handleClose} className={({ isActive }) => `btn w-100 text-start border-0 ${isActive ? 'btn-warning text-dark fw-bold' : 'btn-outline-light'}`}>
                        🧾 BILLING (POS)
                    </NavLink>
                    <NavLink to="/master/orders" onClick={handleClose} className={({ isActive }) => `btn w-100 text-start border-0 d-flex justify-content-between align-items-center ${isActive ? 'btn-warning text-dark fw-bold' : 'btn-outline-light'}`}>
                        <span>🔔 ONLINE ORDERS</span>
                        {counts.orders > 0 && <Badge bg="danger" pill>{counts.orders}</Badge>}
                    </NavLink>
                    <NavLink to="/master/history" onClick={handleClose} className={({ isActive }) => `btn w-100 text-start border-0 ${isActive ? 'btn-primary text-white' : 'btn-outline-light'}`}>
                        📜 SALES HISTORY
                    </NavLink>
                    <NavLink to="/master/ledger" onClick={handleClose} className={({ isActive }) => `btn w-100 text-start border-0 ${isActive ? 'btn-danger text-white' : 'btn-outline-light'}`}>
                        📒 LEDGER (KHATA)
                    </NavLink>
                    <NavLink to="/master/returns" onClick={handleClose} className={({ isActive }) => `btn w-100 text-start border-0 d-flex justify-content-between align-items-center ${isActive ? 'btn-danger text-white' : 'btn-outline-light'}`}>
                        <span>↩️ RETURNS</span>
                        {counts.returns > 0 && <Badge bg="warning" text="dark" pill>{counts.returns}</Badge>}
                    </NavLink>

                    <small className="text-muted mt-3 ms-2 fw-bold text-uppercase" style={{fontSize: '0.7rem'}}>Management</small>
                    <NavLink to="/master/staff" onClick={handleClose} className={({ isActive }) => `btn w-100 text-start border-0 ${isActive ? 'btn-info text-dark fw-bold' : 'btn-outline-light'}`}>
                        👥 STAFF
                    </NavLink>
                    <NavLink to="/master/reports" onClick={handleClose} className={({ isActive }) => `btn w-100 text-start border-0 ${isActive ? 'btn-info text-dark fw-bold' : 'btn-outline-light'}`}>
                        📊 STAFF REPORTS
                    </NavLink>
                    <NavLink to="/master/retailers" onClick={handleClose} className={({ isActive }) => `btn w-100 text-start border-0 ${isActive ? 'btn-primary text-white' : 'btn-outline-light'}`}>
                        🏢 RETAILERS
                    </NavLink>
                    <NavLink to="/master/partners" onClick={handleClose} className={({ isActive }) => `btn w-100 text-start border-0 ${isActive ? 'btn-secondary text-white' : 'btn-outline-light'}`}>
                        🚚 DRIVERS
                    </NavLink>
                </div>
            </div>

            {/* FIXED FOOTER */}
            <div className="pt-3 border-top border-secondary px-2 pb-3 bg-dark">
                <NavLink to="/master/settings" onClick={handleClose} className={({ isActive }) => `btn w-100 text-start mb-2 ${isActive ? 'btn-secondary text-white' : 'btn-outline-secondary text-light'}`}>
                    ⚙️ SETTINGS
                </NavLink>
                <div className="text-white-50 small mb-2 text-center">User: {userName}</div>
                <button onClick={logout} className="btn btn-danger w-100 btn-sm fw-bold">LOGOUT</button>
            </div>
        </div>
    );

    return (
        <div className="d-flex vh-100 overflow-hidden bg-light">
            {/* 1. DESKTOP SIDEBAR */}
            <div className="d-none d-md-block bg-dark text-white shadow" style={{ width: '280px', minWidth: '280px' }}>
                <SidebarContent isMobile={false} />
            </div>

            {/* 2. MAIN CONTENT AREA */}
            <div className="d-flex flex-column flex-grow-1 w-100">
                {/* MOBILE HEADER */}
                <div className="d-md-none bg-dark text-white p-3 d-flex align-items-center justify-content-between shadow-sm sticky-top">
                    <span className="fw-bold h5 mb-0 text-warning">SubhAuto</span>
                    <Button variant="outline-light" size="sm" onClick={handleShow}>
                        ☰ MENU
                    </Button>
                </div>

                {/* Content Outlet */}
                <div className="flex-grow-1 overflow-auto p-3 p-md-4">
                    <Outlet />
                </div>
            </div>

            {/* 3. MOBILE MENU (OFFCANVAS) */}
            <Offcanvas show={showMobileMenu} onHide={handleClose} className="bg-dark text-white" style={{width: '85%'}}>
                <Offcanvas.Header closeButton closeVariant="white" className="border-bottom border-secondary">
                    <Offcanvas.Title className="text-warning fw-bold">Menu</Offcanvas.Title>
                </Offcanvas.Header>
                {/* 'p-0' and 'overflow-hidden' ensures SidebarContent controls the scroll */}
                <Offcanvas.Body className="p-0 overflow-hidden">
                    <SidebarContent isMobile={true} />
                </Offcanvas.Body>
            </Offcanvas>
        </div>
    );
};

export default MasterLayout;
