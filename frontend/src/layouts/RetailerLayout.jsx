import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';

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
            {/* React-Bootstrap Navbar handles the toggle logic automatically */}
            <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
                <Container fluid>
                    <Navbar.Brand className="fw-bold text-warning">SubhAuto B2B</Navbar.Brand>

                    <Navbar.Toggle aria-controls="retailer-navbar-nav" />

                    <Navbar.Collapse id="retailer-navbar-nav">
                        <Nav className="me-auto my-2 my-lg-0">
                            <Nav.Link as={NavLink} to="/retailer/catalog" className={({isActive}) => isActive ? 'active fw-bold text-white' : ''}>
                                🛒 Catalog
                            </Nav.Link>
                            <Nav.Link as={NavLink} to="/retailer/orders" className={({isActive}) => isActive ? 'active fw-bold text-white' : ''}>
                                📦 My Orders
                            </Nav.Link>
                        </Nav>

                        <div className="d-flex align-items-center gap-3 mt-3 mt-lg-0 border-top border-lg-0 pt-3 pt-lg-0 border-secondary">
                            <span className="text-white-50 small">Welcome, {userName}</span>
                            <Button variant="outline-danger" size="sm" onClick={logout}>Logout</Button>
                        </div>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            {/* Main Content */}
            <div className="flex-grow-1 overflow-auto p-3">
                <Container>
                    <Outlet />
                </Container>
            </div>
        </div>
    );
};

export default RetailerLayout;
