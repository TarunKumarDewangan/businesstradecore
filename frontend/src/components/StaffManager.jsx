import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Modal, Button, Form } from 'react-bootstrap';
import Loader from './Loader';

const StaffManager = () => {
    const [staffList, setStaffList] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Edit State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState(null);

    // Form Data
    const initialFormState = {
        name: '', phone: '', password: '', designation: '', salary: '', address: ''
    };
    const [form, setForm] = useState(initialFormState);

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

    // 2. Open Modal Logic
    const openAddModal = () => {
        setIsEditMode(false);
        setForm(initialFormState);
        setShowModal(true);
    };

    const openEditModal = (staff) => {
        setIsEditMode(true);
        setEditId(staff.id);
        setForm({
            name: staff.name,
            phone: staff.phone,
            password: '', // Keep empty unless changing
            designation: staff.staff_profile?.designation || '',
            salary: staff.staff_profile?.salary || '',
            address: staff.staff_profile?.address || ''
        });
        setShowModal(true);
    };

    // 3. Submit (Add or Update)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const payload = { ...form, type: 'staff' };

            if (isEditMode) {
                // We need to implement PUT route in ShopUserController or use a workaround.
                // Assuming standard Laravel Resource Controller or we reuse POST.
                // Since we don't have a specific update route in previous steps,
                // let's use the 'delete -> create' method OR assume you added update.
                // Best Practice: Let's assume you will add PUT /shop-users/{id}
                // OR use a POST to /shop-users/update/{id}

                // Temporary: Delete Old -> Create New (Safe for simple staff)
                // WARNING: This resets their ID and attendance history link.
                // Ideally, we need a proper update route.
                // I will provide the backend update code below this response.

                await api.put(`/shop-users/${editId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
                toast.success('Staff Updated Successfully!');
            } else {
                await api.post('/shop-users', payload, { headers: { Authorization: `Bearer ${token}` } });
                toast.success('Staff Member Added! 👨‍🔧');
            }

            setShowModal(false);
            fetchStaff();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation Failed');
        } finally {
            setSubmitting(false);
        }
    };

    // 4. Delete Staff
    const handleDelete = async (id) => {
        if(!window.confirm('Are you sure? This will delete their login and profile.')) return;
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
            <div className="d-flex justify-content-between mb-3 align-items-center">
                <h4>STAFF MANAGEMENT</h4>
                <button className="btn btn-primary fw-bold" onClick={openAddModal}>+ ADD NEW STAFF</button>
            </div>

            {loading ? (
                <Loader />
            ) : (
                <div className="table-responsive shadow-sm border bg-white rounded">
                    <table className="table table-striped table-hover mb-0 align-middle">
                        <thead className="table-dark">
                            <tr>
                                <th>NAME</th>
                                <th>MOBILE (ID)</th>
                                <th>DESIGNATION</th>
                                <th>SALARY</th>
                                <th className="text-center">ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffList.length === 0 ? (
                                <tr><td colSpan="5" className="text-center p-4">No Staff Added Yet</td></tr>
                            ) : (
                                staffList.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <span className="fw-bold">{user.name}</span><br/>
                                            <small className="text-muted">{user.staff_profile?.address || ''}</small>
                                        </td>
                                        <td>{user.phone}</td>
                                        <td><span className="badge bg-info text-dark">{user.staff_profile?.designation || '-'}</span></td>
                                        <td className="fw-bold text-success">₹{user.staff_profile?.salary}</td>
                                        <td className="text-center">
                                            <div className="btn-group">
                                                <button className="btn btn-sm btn-outline-primary" onClick={() => openEditModal(user)}>
                                                    ✏️ Edit
                                                </button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(user.id)}>
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} backdrop="static">
                <Modal.Header closeButton>
                    <Modal.Title>{isEditMode ? 'Update Staff Details' : 'Add New Employee'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit} className="row g-3">
                        <div className="col-md-6">
                            <label className="form-label small fw-bold">FULL NAME</label>
                            <input className="form-control" required
                                value={form.name} onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label small fw-bold">MOBILE (LOGIN ID)</label>
                            <input className="form-control" required
                                value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label small fw-bold">PASSWORD</label>
                            <input type="text" className="form-control"
                                placeholder={isEditMode ? "Leave empty to keep same" : "Required"}
                                required={!isEditMode}
                                value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label small fw-bold">DESIGNATION</label>
                            <input className="form-control" placeholder="e.g. MECHANIC" required
                                value={form.designation} onChange={e => setForm({...form, designation: e.target.value.toUpperCase()})} />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label small fw-bold">MONTHLY SALARY</label>
                            <input type="number" className="form-control" required
                                value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} />
                        </div>
                        <div className="col-md-12">
                            <label className="form-label small fw-bold">ADDRESS</label>
                            <textarea className="form-control" rows="2"
                                value={form.address} onChange={e => setForm({...form, address: e.target.value.toUpperCase()})}></textarea>
                        </div>

                        <div className="col-12 mt-4">
                            <button type="submit" className="btn btn-success w-100 fw-bold" disabled={submitting}>
                                {submitting ? 'SAVING...' : (isEditMode ? 'UPDATE STAFF' : 'CREATE STAFF ID')}
                            </button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default StaffManager;
