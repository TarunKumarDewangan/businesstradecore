import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Modal, Button, Form } from 'react-bootstrap';
import Loader from './Loader';

const RetailerManager = () => {
    const [allUsers, setAllUsers] = useState([]); // Store everything
    const [view, setView] = useState('b2b'); // 'b2b' or 'walkin'

    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form Data
    const [form, setForm] = useState({
        name: '', retailer_shop_name: '', phone: '', password: '', gst_number: '', credit_limit: '', address: ''
    });

    // 1. Fetch ALL Retailers (Role 5)
    const fetchRetailers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/shop-users?type=retailer', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) {
                setAllUsers(res.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRetailers(); }, []);

    // 2. Strict Filter Logic (Using DB Flag)
    const filteredList = allUsers.filter(user => {
        // Default to 'b2b' if missing (for old records)
        const type = user.retailer_detail?.customer_type || 'b2b';

        if (view === 'b2b') return type === 'b2b';
        if (view === 'walkin') return type === 'walkin';
        return true;
    });

    // 3. Submit (Sends the current View as customer_type)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');

            // PAYLOAD: Includes customer_type based on active tab
            const payload = {
                ...form,
                type: 'retailer', // Role
                customer_type: view // 'b2b' or 'walkin'
            };

            const res = await api.post('/shop-users', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.status) {
                toast.success(`${view === 'b2b' ? 'Retailer' : 'Customer'} Added! 🤝`);
                setShowModal(false);
                // Reset Form
                setForm({ name: '', retailer_shop_name: '', phone: '', password: '', gst_number: '', credit_limit: '', address: '' });
                fetchRetailers();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error adding client');
        } finally {
            setSubmitting(false);
        }
    };

    // 4. Delete
    const handleDelete = async (id) => {
        if(!window.confirm('Are you sure? This will delete their ledger history too.')) return;
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/shop-users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Deleted');
            fetchRetailers();
        } catch (error) { toast.error('Error deleting'); }
    };

    return (
        <div className="mt-3">
            <div className="d-flex justify-content-between mb-3 align-items-center">
                <h4>CLIENT MANAGEMENT</h4>
                <button
                    className={`btn fw-bold text-white ${view === 'b2b' ? 'btn-primary' : 'btn-success'}`}
                    onClick={() => setShowModal(true)}
                >
                    + ADD NEW {view === 'b2b' ? 'RETAILER' : 'WALK-IN'}
                </button>
            </div>

            {/* TABS */}
            <div className="btn-group mb-3 w-100 w-md-auto">
                <button
                    className={`btn ${view === 'b2b' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setView('b2b')}
                >
                    🏢 B2B Retailers
                </button>
                <button
                    className={`btn ${view === 'walkin' ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => setView('walkin')}
                >
                    👤 Walk-in Customers
                </button>
            </div>

            {loading ? (
                <Loader />
            ) : (
                <div className="table-responsive shadow-sm border bg-white">
                    <table className="table table-hover mb-0">
                        <thead className="table-light">
                            <tr>
                                <th>{view === 'b2b' ? 'SHOP NAME' : 'NAME'}</th>
                                <th>MOBILE</th>
                                <th>{view === 'b2b' ? 'GST NO' : 'ADDRESS'}</th>
                                <th>CREDIT LIMIT</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredList.length === 0 ? (
                                <tr><td colSpan="5" className="text-center p-4 text-muted">No {view === 'b2b' ? 'Retailers' : 'Walk-ins'} Found</td></tr>
                            ) : (
                                filteredList.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <strong>{view === 'b2b' ? user.retailer_detail?.retailer_shop_name : user.name}</strong>
                                            {view === 'b2b' && <div className="text-muted small">Owner: {user.name}</div>}
                                        </td>
                                        <td>
                                            <span className="badge bg-secondary">{user.phone}</span>
                                        </td>
                                        <td>
                                            {view === 'b2b'
                                                ? (user.retailer_detail?.gst_number || 'N/A')
                                                : (user.retailer_detail?.address || '-')
                                            }
                                        </td>
                                        <td className="text-success fw-bold">₹{user.retailer_detail?.credit_limit}</td>
                                        <td>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user.id)}>REMOVE</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton className={view === 'b2b' ? 'bg-primary text-white' : 'bg-success text-white'}>
                    <Modal.Title>ADD {view === 'b2b' ? 'B2B CLIENT' : 'WALK-IN CUSTOMER'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit} className="row g-3">

                        {/* Only Show Shop Name if B2B */}
                        {view === 'b2b' && (
                            <div className="col-md-6">
                                <label>SHOP NAME</label>
                                <input className="form-control" required
                                    value={form.retailer_shop_name} onChange={e => setForm({...form, retailer_shop_name: e.target.value.toUpperCase()})} />
                            </div>
                        )}

                        <div className="col-md-6">
                            <label>PERSON NAME</label>
                            <input className="form-control" required
                                value={form.name} onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} />
                        </div>

                        <div className="col-md-6">
                            <label>MOBILE (LOGIN ID)</label>
                            <input className="form-control" required
                                value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                            <label>PASSWORD</label>
                            <input type="text" className="form-control" required
                                value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                        </div>

                        {view === 'b2b' && (
                            <div className="col-md-6">
                                <label>GST NUMBER</label>
                                <input className="form-control"
                                    value={form.gst_number} onChange={e => setForm({...form, gst_number: e.target.value.toUpperCase()})} />
                            </div>
                        )}

                        <div className="col-md-6">
                            <label>CREDIT LIMIT (₹)</label>
                            <input type="number" className="form-control" required
                                value={form.credit_limit} onChange={e => setForm({...form, credit_limit: e.target.value})} />
                        </div>

                        <div className="col-12">
                            <label>ADDRESS</label>
                            <textarea className="form-control" rows="2"
                                value={form.address} onChange={e => setForm({...form, address: e.target.value.toUpperCase()})}></textarea>
                        </div>

                        <div className="col-12 mt-4">
                            <button type="submit" className={`btn w-100 fw-bold ${view === 'b2b' ? 'btn-primary' : 'btn-success'}`} disabled={submitting}>
                                {submitting ? 'SAVING...' : 'CREATE ACCOUNT'}
                            </button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default RetailerManager;
