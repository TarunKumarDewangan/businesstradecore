import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Modal, Button, Form } from 'react-bootstrap';
import Loader from './Loader'; // Import Loader

const StaffManager = () => {
    const [staffList, setStaffList] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true); // Fetch loading state
    const [submitting, setSubmitting] = useState(false); // Button loading state

    // Form Data
    const [form, setForm] = useState({
        name: '', phone: '', password: '', designation: '', salary: '', address: ''
    });

    // 1. Fetch Staff
    const fetchStaff = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/shop-users?type=staff', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) setStaffList(res.data.data);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchStaff(); }, []);

    // 2. Submit New Staff
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const payload = { ...form, type: 'staff' };

            const res = await api.post('/shop-users', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.status) {
                toast.success('Staff Member Added! 👨‍🔧');
                setShowModal(false);
                setForm({ name: '', phone: '', password: '', designation: '', salary: '', address: '' });
                fetchStaff();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error adding staff');
        } finally {
            setSubmitting(false);
        }
    };

    // 3. Delete Staff
    const handleDelete = async (id) => {
        if(!window.confirm('Are you sure? They will lose login access.')) return;
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/shop-users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Deleted');
            fetchStaff();
        } catch (error) { toast.error('Error deleting'); }
    };

    return (
        <div className="mt-3">
            <div className="d-flex justify-content-between mb-3">
                <h4>STAFF MANAGEMENT</h4>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ ADD NEW STAFF</button>
            </div>

            {loading ? (
                <Loader />
            ) : (
                <div className="table-responsive">
                    <table className="table table-bordered table-hover">
                        <thead className="table-secondary">
                            <tr>
                                <th>NAME</th>
                                <th>MOBILE (ID)</th>
                                <th>DESIGNATION</th>
                                <th>SALARY</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffList.length === 0 ? (
                                <tr><td colSpan="5" className="text-center">No Staff Added Yet</td></tr>
                            ) : (
                                staffList.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <strong>{user.name}</strong><br/>
                                            <small className="text-muted">{user.staff_profile?.address || ''}</small>
                                        </td>
                                        <td>{user.phone}</td>
                                        <td>{user.staff_profile?.designation || '-'}</td>
                                        <td>₹{user.staff_profile?.salary}</td>
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

            {/* Add Staff Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton><Modal.Title>ADD NEW EMPLOYEE</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit} className="row g-3">
                        <div className="col-md-6">
                            <label>FULL NAME</label>
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
                        <div className="col-md-6">
                            <label>DESIGNATION</label>
                            <input className="form-control" placeholder="e.g. MECHANIC" required
                                value={form.designation} onChange={e => setForm({...form, designation: e.target.value.toUpperCase()})} />
                        </div>

                        <div className="col-md-6">
                            <label>MONTHLY SALARY</label>
                            <input type="number" className="form-control" required
                                value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} />
                        </div>
                        <div className="col-md-12">
                            <label>ADDRESS</label>
                            <textarea className="form-control" rows="2"
                                value={form.address} onChange={e => setForm({...form, address: e.target.value.toUpperCase()})}></textarea>
                        </div>

                        <div className="col-12 mt-4">
                            <button type="submit" className="btn btn-success w-100" disabled={submitting}>
                                {submitting ? 'SAVING...' : 'CREATE STAFF ID'}
                            </button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default StaffManager;
