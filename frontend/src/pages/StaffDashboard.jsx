import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import Loader from '../components/Loader';
import { Modal, Button, Form } from 'react-bootstrap';

const StaffDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

    // Work Log State
    const [workTitle, setWorkTitle] = useState('');
    const [workDesc, setWorkDesc] = useState('');

    // Job Card State
    const [showJobModal, setShowJobModal] = useState(false);
    const [jobForm, setJobForm] = useState({ vehicle_number: '', customer_name: '', customer_phone: '' });
    const [jobItems, setJobItems] = useState([]); // Inventory for search
    const [jobCart, setJobCart] = useState([]);
    const [itemSearch, setItemSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // 1. Clock Timer
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. Fetch Status
    const fetchStatus = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/staff/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) setAttendance(res.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStatus(); }, []);

    // 3. Handle Punch In/Out (With GPS)
    const handlePunch = () => {
        if (!navigator.geolocation) {
            return toast.error("Geolocation is not supported.");
        }

        toast.info("Getting Location...");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                try {
                    const token = localStorage.getItem('token');
                    const res = await api.post('/staff/punch', { lat, lng }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (res.data.status) {
                        toast.success(res.data.message);
                        fetchStatus();
                    }
                } catch (error) {
                    toast.error(error.response?.data?.message || 'Action failed');
                }
            },
            (error) => { toast.error("Please Allow Location Access."); },
            { enableHighAccuracy: true }
        );
    };

    // 4. Submit Work Log
    const handleSubmitLog = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/staff/worklog', {
                title: workTitle, description: workDesc
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.status) {
                toast.success('Work Report Submitted! ✅');
                setWorkTitle(''); setWorkDesc('');
            }
        } catch (error) { toast.error('Failed to submit report'); }
    };

    // 5. JOB CARD LOGIC (For Staff)
    const openJobModal = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/items?page=1', { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) setJobItems(res.data.data.data);
            setShowJobModal(true);
        } catch (e) { toast.error('Failed to load items'); }
    };

    // --- IMPROVED SEARCH LOGIC (Matches Name, Part No, Category) ---
    const filteredItems = jobItems.filter(i => {
        const search = itemSearch.toLowerCase();
        return (
            i.item_name.toLowerCase().includes(search) ||
            (i.part_number && i.part_number.toLowerCase().includes(search)) ||
            (i.category?.name && i.category.name.toLowerCase().includes(search)) ||
            (i.compatible_models && i.compatible_models.toLowerCase().includes(search))
        );
    });

    const addToJobCart = (item) => {
        if(item.stock_quantity <= 0) return toast.error('Out of Stock. Ask Master to update.');
        const existing = jobCart.find(c => c.id === item.id);
        if (existing) {
            if (existing.quantity + 1 > item.stock_quantity) return toast.warning('Max stock reached');
            setJobCart(jobCart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setJobCart([...jobCart, { ...item, quantity: 1 }]);
        }
        setItemSearch('');
    };

    const submitJobCard = async () => {
        if (!jobForm.vehicle_number) return toast.error('Vehicle No required');

        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...jobForm,
                items: jobCart.map(i => ({ id: i.id, quantity: i.quantity })),
                service_charge: 0 // Staff cannot set price, Master will verify
            };

            const res = await api.post('/repairs', payload, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.status) {
                toast.success('Job Card Sent to Owner! 🚀');
                setShowJobModal(false);
                setJobForm({ vehicle_number: '', customer_name: '', customer_phone: '' });
                setJobCart([]);
            }
        } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
    };

    return (
        <div className="container" style={{ maxWidth: '600px' }}>

            {/* 1. ATTENDANCE CARD */}
            <div className="card shadow-sm mb-4 text-center border-0">
                <div className="card-body py-4">
                    <h5 className="text-muted">Current Time</h5>
                    <h2 className="display-4 fw-bold text-dark">{currentTime}</h2>

                    {loading ? <Loader /> : (
                        <div className="mt-4">
                            {!attendance || attendance.check_out ? (
                                <div>
                                    {attendance && attendance.check_out && (
                                        <div className="alert alert-secondary d-inline-block px-4 py-1 rounded-pill mb-3">
                                            Last Session: {attendance.check_in} - {attendance.check_out}
                                        </div>
                                    )}
                                    <br/>
                                    <button className="btn btn-success btn-lg rounded-pill px-5 py-3 shadow" onClick={handlePunch}>
                                        {attendance ? '🔄 RE-CHECK IN' : '☀️ PUNCH IN'}
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className="alert alert-success d-inline-block px-4 py-1 rounded-pill mb-3">
                                        In: {attendance.check_in}
                                    </div>
                                    <br/>
                                    <button className="btn btn-danger btn-lg rounded-pill px-5 py-3 shadow" onClick={handlePunch}>
                                        🌙 PUNCH OUT
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 2. CREATE JOB CARD BUTTON */}
            <button className="btn btn-warning w-100 py-3 mb-4 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2" onClick={openJobModal}>
                <span className="fs-4">🛠️</span> CREATE NEW JOB CARD
            </button>

            {/* 3. WORK REPORT CARD */}
            <div className="card shadow-sm border-0">
                <div className="card-header bg-white fw-bold">
                    📝 Submit Daily Work Report
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmitLog}>
                        <div className="mb-3">
                            <label className="form-label small text-muted">Title</label>
                            <input type="text" className="form-control" required value={workTitle} onChange={e => setWorkTitle(e.target.value)} />
                        </div>
                        <div className="mb-3">
                            <label className="form-label small text-muted">Details</label>
                            <textarea className="form-control" rows="3" value={workDesc} onChange={e => setWorkDesc(e.target.value)}></textarea>
                        </div>
                        <button type="submit" className="btn btn-primary w-100">Submit Report</button>
                    </form>
                </div>
            </div>

            {/* JOB CARD MODAL */}
            <Modal show={showJobModal} onHide={() => setShowJobModal(false)} fullscreen>
                <Modal.Header closeButton className="bg-warning">
                    <Modal.Title>🛠️ New Service Job</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-light">
                    <div className="row h-100">
                        {/* LEFT: FORM */}
                        <div className="col-md-5 mb-3">
                            <div className="card shadow-sm p-3">
                                <h6 className="fw-bold border-bottom pb-2">Vehicle Details</h6>
                                <div className="mb-2">
                                    <label className="small fw-bold">Vehicle No *</label>
                                    <input className="form-control text-uppercase" placeholder="MH-12-AB-1234" value={jobForm.vehicle_number} onChange={e => setJobForm({...jobForm, vehicle_number: e.target.value.toUpperCase()})} />
                                </div>
                                <div className="row g-2 mb-3">
                                    <div className="col-6"><input className="form-control form-control-sm" placeholder="Cust Name" value={jobForm.customer_name} onChange={e => setJobForm({...jobForm, customer_name: e.target.value})} /></div>
                                    <div className="col-6"><input className="form-control form-control-sm" placeholder="Phone" value={jobForm.customer_phone} onChange={e => setJobForm({...jobForm, customer_phone: e.target.value})} /></div>
                                </div>

                                <h6 className="small fw-bold border-bottom pb-1">Add Parts Used</h6>
                                <div className="position-relative mb-2">
                                    <input
                                        className="form-control"
                                        placeholder="Search by Name, Part No, Category..."
                                        value={itemSearch}
                                        onChange={e => { setItemSearch(e.target.value); setIsDropdownOpen(true); }}
                                    />
                                    {isDropdownOpen && itemSearch && (
                                        <div className="list-group position-absolute w-100 shadow" style={{zIndex: 1000, maxHeight: '200px', overflowY: 'auto'}}>
                                            {filteredItems.map(i => (
                                                <button
                                                    key={i.id}
                                                    className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                                                    onClick={() => addToJobCart(i)}
                                                >
                                                    <div className="text-start">
                                                        <div className="fw-bold">{i.item_name}</div>
                                                        <div className="small text-muted" style={{fontSize: '0.75rem'}}>
                                                            {i.part_number ? `${i.part_number} | ` : ''} {i.category?.name}
                                                        </div>
                                                    </div>
                                                    <span className="badge bg-success">{i.stock_quantity}</span>
                                                </button>
                                            ))}
                                            {filteredItems.length === 0 && <div className="p-2 text-center text-muted small">No items found</div>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: SUMMARY */}
                        <div className="col-md-7">
                            <div className="card shadow-sm p-3 h-100">
                                <h6 className="fw-bold">Job Summary</h6>
                                <div className="table-responsive flex-grow-1">
                                    <table className="table table-sm table-bordered mt-2 align-middle">
                                        <thead className="table-light"><tr><th>Part</th><th style={{width: '80px'}}>Qty</th><th>Price</th><th>Action</th></tr></thead>
                                        <tbody>
                                            {jobCart.map((i, idx) => (
                                                <tr key={idx}>
                                                    <td>
                                                        {i.item_name}
                                                        <div className="small text-muted">{i.part_number}</div>
                                                    </td>
                                                    <td>{i.quantity}</td>
                                                    <td>₹{i.selling_price * i.quantity}</td>
                                                    <td><button className="btn btn-sm text-danger" onClick={() => setJobCart(jobCart.filter((_, index) => index !== idx))}>×</button></td>
                                                </tr>
                                            ))}
                                            {jobCart.length === 0 && <tr><td colSpan="4" className="text-center text-muted p-4">No parts added</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-auto pt-3 border-top">
                                    <div className="d-flex justify-content-between h4 fw-bold text-success">
                                        <span>Total Est:</span>
                                        <span>₹{jobCart.reduce((acc, i) => acc + (i.selling_price * i.quantity), 0)}</span>
                                    </div>
                                    <button className="btn btn-success w-100 mt-3 fw-bold py-2" onClick={submitJobCard}>✅ SUBMIT TO OWNER</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default StaffDashboard;
