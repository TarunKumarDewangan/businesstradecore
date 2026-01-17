import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';

const SuperAdminDashboard = () => {
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState(null);

    // Form State
    const initialForm = {
        shop_name: '', gst_number: '',
        owner_name: '', owner_mobile: '', password: ''
    };
    const [formData, setFormData] = useState(initialForm);

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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchShops(); }, []);

    // 2. Handle Inputs
    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // 3. Open Modals
    const openAddModal = () => {
        setIsEditMode(false);
        setFormData(initialForm);
        setShowModal(true);
    };

    const openEditModal = (shop) => {
        setIsEditMode(true);
        setEditId(shop.id);
        setFormData({
            shop_name: shop.shop_name,
            gst_number: shop.gst_number || '',
            owner_name: shop.owner?.name || '',
            owner_mobile: shop.owner?.phone || '',
            password: '' // Keep empty
        });
        setShowModal(true);
    };

    // 4. Submit (Add/Update)
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            if (isEditMode) {
                await api.put(`/shops/${editId}`, formData, { headers });
                toast.success('Shop Updated Successfully!');
            } else {
                await api.post('/shops', formData, { headers });
                toast.success('Shop Created Successfully!');
            }

            setShowModal(false);
            fetchShops();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Something went wrong');
        }
    };

    // 5. Toggle Status
    const toggleStatus = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await api.post(`/shops/${id}/toggle`, {}, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Status Updated');
            fetchShops();
        } catch (error) { toast.error('Failed to update status'); }
    };

    // 6. Delete Shop
    const handleDelete = async (id) => {
        if(!window.confirm('Are you sure? This will delete the Shop, Owner, Inventory and All Data!')) return;
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/shops/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Shop Deleted');
            fetchShops();
        } catch (error) { toast.error('Delete Failed'); }
    };

    const logout = () => {
        localStorage.clear();
        navigate('/');
        toast.info("Logged out");
    };

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3>Super Admin Panel</h3>
                <button onClick={logout} className="btn btn-sm btn-outline-danger">Logout</button>
            </div>

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

            <div className="card shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Registered Shops</h5>
                    <button className="btn btn-success btn-sm" onClick={openAddModal}>+ Add Shop</button>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-striped mb-0 align-middle">
                            <thead className="table-dark">
                                <tr>
                                    <th>ID</th>
                                    <th>Shop Info</th>
                                    <th>Owner Info</th>
                                    <th>Active</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center">Loading...</td></tr>
                                ) : shops.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center">No Shops Found</td></tr>
                                ) : (
                                    shops.map((shop) => (
                                        <tr key={shop.id}>
                                            <td>{shop.id}</td>
                                            <td>
                                                <strong>{shop.shop_name}</strong><br/>
                                                <small className="text-muted">GST: {shop.gst_number || 'N/A'}</small>
                                            </td>
                                            <td>
                                                {shop.owner ? (
                                                    <>
                                                        {shop.owner.name}<br/>
                                                        <small className="text-muted">{shop.owner.phone}</small>
                                                    </>
                                                ) : <span className="text-danger">No Owner</span>}
                                            </td>
                                            <td>
                                                <Form.Check
                                                    type="switch"
                                                    id={`switch-${shop.id}`}
                                                    label={shop.is_active ? 'Active' : 'Banned'}
                                                    checked={!!shop.is_active}
                                                    onChange={() => toggleStatus(shop.id)}
                                                    className={shop.is_active ? 'text-success' : 'text-danger'}
                                                />
                                            </td>
                                            <td>
                                                <button className="btn btn-sm btn-primary me-2" onClick={() => openEditModal(shop)}>Edit</button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(shop.id)}>Delete</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ADD / EDIT MODAL */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditMode ? 'Edit Shop' : 'Add New Shop'}</Modal.Title>
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
                            <Form.Label>Password {isEditMode && <small>(Leave blank to keep same)</small>}</Form.Label>
                            <Form.Control type="password" name="password" required={!isEditMode} onChange={handleInputChange} value={formData.password} />
                        </Form.Group>

                        <Button variant="primary" type="submit" className="w-100 mt-3">
                            {isEditMode ? 'Update Shop' : 'Create Shop'}
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default SuperAdminDashboard;
