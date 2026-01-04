import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Form } from 'react-bootstrap';
import { toast } from 'react-toastify'; // Import Toast

const SuperAdminDashboard = () => {
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        shop_name: '',
        gst_number: '',
        owner_name: '',
        owner_mobile: '',
        owner_email: '',
        password: ''
    });

    const navigate = useNavigate();

    // 1. Fetch Shops
    const fetchShops = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/shops', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.status) {
                setShops(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching shops", error);
            toast.error("Failed to load shops.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShops();
    }, []);

    // 2. Handle Input Change
    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // 3. Submit New Shop
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await api.post('/shops', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.status) {
                toast.success('Shop Created Successfully! 🎉'); // Success Toast
                setShowModal(false);
                setFormData({
                    shop_name: '', gst_number: '', owner_name: '',
                    owner_mobile: '', owner_email: '', password: ''
                });
                fetchShops(); // Refresh List
            }
        } catch (error) {
            // Error Toast
            toast.error(error.response?.data?.message || 'Something went wrong');
        }
    };

    const logout = () => {
        localStorage.clear();
        navigate('/');
        toast.info("Logged out successfully");
    };

    return (
        <div className="container mt-4">
            {/* Header Area */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3>Super Admin Panel</h3>
                <button onClick={logout} className="btn btn-sm btn-outline-danger">Logout</button>
            </div>

            {/* Stats Cards */}
            <div className="row mb-4">
                <div className="col-12 col-md-4">
                    <div className="card bg-primary text-white shadow-sm">
                        <div className="card-body">
                            <h5>Total Shops</h5>
                            <h2>{shops.length}</h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shops List Table */}
            <div className="card shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Registered Shops</h5>
                    <button className="btn btn-success btn-sm" onClick={() => setShowModal(true)}>+ Add Shop</button>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-striped mb-0">
                            <thead className="table-dark">
                                <tr>
                                    <th>ID</th>
                                    <th>Shop Name</th>
                                    <th>Owner</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="4" className="text-center">Loading...</td></tr>
                                ) : shops.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center">No Shops Found</td></tr>
                                ) : (
                                    shops.map((shop) => (
                                        <tr key={shop.id}>
                                            <td>{shop.id}</td>
                                            <td>
                                                <strong>{shop.shop_name}</strong><br/>
                                                <small className="text-muted">GST: {shop.gst_number || 'N/A'}</small>
                                            </td>
                                            <td>Owner ID: {shop.id} (Ref)</td>
                                            <td>
                                                <span className={`badge ${shop.is_active ? 'bg-success' : 'bg-danger'}`}>
                                                    {shop.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add Shop Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Add New Shop</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>
                        <h6 className="text-muted mb-3">Shop Information</h6>
                        <Form.Group className="mb-2">
                            <Form.Label>Shop Name</Form.Label>
                            <Form.Control type="text" name="shop_name" required onChange={handleInputChange} value={formData.shop_name} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>GST Number</Form.Label>
                            <Form.Control type="text" name="gst_number" onChange={handleInputChange} value={formData.gst_number} />
                        </Form.Group>

                        <hr />
                        <h6 className="text-muted mb-3">Owner Information</h6>
                        <Form.Group className="mb-2">
                            <Form.Label>Owner Name</Form.Label>
                            <Form.Control type="text" name="owner_name" required onChange={handleInputChange} value={formData.owner_name} />
                        </Form.Group>
                        <Form.Group className="mb-2">
                            <Form.Label>Mobile (Login ID)</Form.Label>
                            <Form.Control type="text" name="owner_mobile" required onChange={handleInputChange} value={formData.owner_mobile} />
                        </Form.Group>
                        <Form.Group className="mb-2">
                            <Form.Label>Password</Form.Label>
                            <Form.Control type="password" name="password" required onChange={handleInputChange} value={formData.password} />
                        </Form.Group>

                        <Button variant="primary" type="submit" className="w-100 mt-3">
                            Create Shop
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default SuperAdminDashboard;
