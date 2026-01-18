import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import Loader from './Loader';
import { Modal, Button, Form } from 'react-bootstrap';

const RepairManager = () => {
    const [view, setView] = useState('new'); // 'new' or 'history'
    const [loading, setLoading] = useState(false);

    // Data Lists
    const [staffList, setStaffList] = useState([]);
    const [items, setItems] = useState([]); // Inventory

    // New Job Form
    const [form, setForm] = useState({ vehicle_number: '', customer_name: '', customer_phone: '', staff_id: '', service_charge: 0 });
    const [cart, setCart] = useState([]);
    const [itemSearch, setItemSearch] = useState('');

    // History
    const [repairs, setRepairs] = useState([]);
    const [historySearch, setHistorySearch] = useState('');

    // QUICK STOCK MODAL STATE
    const [showStockModal, setShowStockModal] = useState(false);
    const [pendingItem, setPendingItem] = useState(null);
    const [quickStock, setQuickStock] = useState('');
    const [quickPrice, setQuickPrice] = useState('');
    const [quickPurchasePrice, setQuickPurchasePrice] = useState('');

    // Load Initial Data
    useEffect(() => {
        const loadInit = async () => {
            try {
                const token = localStorage.getItem('token');
                const [staffRes, itemRes] = await Promise.all([
                    api.get('/shop-users?type=staff', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/items?page=1', { headers: { Authorization: `Bearer ${token}` } }) // Load Page 1
                ]);
                if (staffRes.data.status) setStaffList(staffRes.data.data);
                if (itemRes.data.status) setItems(itemRes.data.data.data);
            } catch (e) { console.error(e); }
        };
        loadInit();
    }, []);

    // Load History
    useEffect(() => {
        if (view === 'history') {
            const loadHistory = async () => {
                setLoading(true);
                try {
                    const token = localStorage.getItem('token');
                    const res = await api.get(`/repairs?search=${historySearch}`, { headers: { Authorization: `Bearer ${token}` } });
                    if (res.data.status) setRepairs(res.data.data.data);
                } catch(e) { console.error(e); }
                finally { setLoading(false); }
            };
            const timer = setTimeout(() => { loadHistory(); }, 500);
            return () => clearTimeout(timer);
        }
    }, [view, historySearch]);

    // --- IMPROVED SEARCH LOGIC ---
    const filteredItems = items.filter(i => {
        const search = itemSearch.toLowerCase();
        return (
            i.item_name.toLowerCase().includes(search) ||
            (i.part_number && i.part_number.toLowerCase().includes(search)) ||
            (i.category?.name && i.category.name.toLowerCase().includes(search)) ||
            (i.compatible_models && i.compatible_models.toLowerCase().includes(search))
        );
    });

    // Add to Cart
    const addToCart = (item) => {
        if(item.stock_quantity <= 0) {
            openStockModal(item);
            return;
        }
        addItemToCartState(item);
        setItemSearch(''); // Clear search
    };

    const addItemToCartState = (item) => {
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            if (existing.quantity + 1 > item.stock_quantity) return toast.warning('Max stock reached');
            setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, { ...item, quantity: 1 }]);
        }
    };

    const removeFromCart = (id) => setCart(cart.filter(c => c.id !== id));

    const updateQty = (id, newQty) => {
        // Allow typing, validate on blur/submit if needed, or prevent > stock here
        // Ideally we check stock here too but let's keep it simple for now
        setCart(cart.map(c => c.id === id ? { ...c, quantity: parseInt(newQty) || 1 } : c));
    };

    // --- QUICK STOCK UPDATE LOGIC ---
    const openStockModal = (item, e) => {
        if(e) e.stopPropagation();
        setPendingItem(item);
        setQuickStock(item.stock_quantity > 0 ? item.stock_quantity : '');
        setQuickPrice(item.selling_price > 0 ? item.selling_price : '');
        setQuickPurchasePrice('');
        setShowStockModal(true);
    };

    const handleQuickUpdate = async () => {
        if (!quickStock || !quickPrice) return toast.warning('Enter Stock and Selling Price');

        try {
            const token = localStorage.getItem('token');
            const updateData = {
                ...pendingItem,
                stock_quantity: parseInt(quickStock),
                selling_price: parseFloat(quickPrice)
            };
            if (quickPurchasePrice) updateData.purchase_price = parseFloat(quickPurchasePrice);

            const res = await api.put(`/items/${pendingItem.id}`, updateData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.status) {
                toast.success('Stock Updated! Added to Job.');
                const updatedItem = { ...pendingItem, ...updateData };
                setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
                addItemToCartState(updatedItem);
                setShowStockModal(false);
            }
        } catch (err) { toast.error('Update Failed'); }
    };

    // Submit Job
    const handleSubmit = async () => {
        if (!form.vehicle_number || !form.staff_id) return toast.error('Vehicle No & Staff are required');

        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...form,
                items: cart.map(i => ({ id: i.id, quantity: i.quantity }))
            };

            const res = await api.post('/repairs', payload, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.status) {
                toast.success('Job Saved! Stock Updated.');
                setForm({ vehicle_number: '', customer_name: '', customer_phone: '', staff_id: '', service_charge: 0 });
                setCart([]);
                setView('history');
            }
        } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
    };

    const partsTotal = cart.reduce((acc, i) => acc + (i.selling_price * i.quantity), 0);
    const grandTotal = partsTotal + parseFloat(form.service_charge || 0);

    return (
        <div className="container-fluid mt-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4>🛠️ REPAIR & SERVICE</h4>
                <div className="btn-group">
                    <button className={`btn ${view === 'new' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setView('new')}>New Job</button>
                    <button className={`btn ${view === 'history' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setView('history')}>History</button>
                </div>
            </div>

            {view === 'new' && (
                <div className="row h-100">
                    {/* LEFT: FORM & ITEMS */}
                    <div className="col-md-6 d-flex flex-column" style={{maxHeight: '80vh'}}>
                        <div className="card shadow-sm p-3 bg-light mb-3">
                            <h6 className="fw-bold border-bottom pb-2">Vehicle Details</h6>
                            <div className="mb-2">
                                <label className="small fw-bold">Vehicle No *</label>
                                <input className="form-control text-uppercase" placeholder="MH-12-AB-1234" value={form.vehicle_number} onChange={e => setForm({...form, vehicle_number: e.target.value.toUpperCase()})} />
                            </div>
                            <div className="row g-2 mb-2">
                                <div className="col-6">
                                    <label className="small">Customer Name</label>
                                    <input className="form-control form-control-sm" value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} />
                                </div>
                                <div className="col-6">
                                    <label className="small">Phone</label>
                                    <input className="form-control form-control-sm" value={form.customer_phone} onChange={e => setForm({...form, customer_phone: e.target.value})} />
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="small fw-bold">Assigned Mechanic *</label>
                                <select className="form-select" value={form.staff_id} onChange={e => setForm({...form, staff_id: e.target.value})}>
                                    <option value="">-- Select Staff --</option>
                                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* ITEM LIST */}
                        <div className="card shadow-sm p-3 bg-white flex-grow-1 d-flex flex-column" style={{minHeight: '400px'}}>
                            <h6 className="fw-bold border-bottom pb-2">Select Parts</h6>
                            <input
                                className="form-control mb-2"
                                placeholder="🔍 Search Part Name, No, Category..."
                                value={itemSearch}
                                onChange={e => setItemSearch(e.target.value)}
                            />

                            <div className="flex-grow-1 overflow-auto border rounded p-2" style={{maxHeight: '300px'}}>
                                <div className="list-group">
                                    {filteredItems.map(i => (
                                        <div
                                            key={i.id}
                                            className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                                            onClick={() => addToCart(i)}
                                            style={{cursor: 'pointer'}}
                                        >
                                            <div>
                                                <strong>{i.item_name}</strong>
                                                <div className="small text-muted">
                                                    {i.part_number ? `Part: ${i.part_number} | ` : ''}
                                                    {i.category?.name}
                                                </div>
                                                <div className="small text-secondary fst-italic">{i.compatible_models}</div>
                                            </div>
                                            <div className="text-end">
                                                <span className="fw-bold d-block">₹{i.selling_price}</span>
                                                <span className={`badge me-2 ${i.stock_quantity > 0 ? 'bg-success' : 'bg-danger'}`}>
                                                    Stock: {i.stock_quantity}
                                                </span>
                                                <button
                                                    className="btn btn-xs btn-outline-primary py-0 px-1"
                                                    style={{fontSize: '0.7rem'}}
                                                    onClick={(e) => openStockModal(i, e)}
                                                >
                                                    + Stock
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredItems.length === 0 && <div className="text-center p-3 text-muted">No items found</div>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: JOB SUMMARY */}
                    <div className="col-md-6">
                        <div className="card shadow-sm p-3 bg-white h-100">
                            <h6 className="fw-bold">Job Summary</h6>

                            <div className="table-responsive flex-grow-1" style={{maxHeight: '500px'}}>
                                <table className="table table-sm table-bordered mt-2 align-middle">
                                    <thead className="table-light"><tr><th>Part</th><th style={{width: '80px'}}>Qty</th><th>Price</th><th>Action</th></tr></thead>
                                    <tbody>
                                        {cart.map(i => (
                                            <tr key={i.id}>
                                                <td>{i.item_name}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="form-control form-control-sm text-center"
                                                        value={i.quantity}
                                                        onChange={(e) => updateQty(i.id, e.target.value)}
                                                    />
                                                </td>
                                                <td>₹{i.selling_price * i.quantity}</td>
                                                <td><button className="btn btn-sm text-danger" onClick={() => removeFromCart(i.id)}>×</button></td>
                                            </tr>
                                        ))}
                                        {cart.length === 0 && <tr><td colSpan="4" className="text-center text-muted p-4">No parts added</td></tr>}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-auto pt-3 border-top bg-light p-3 rounded">
                                <div className="d-flex justify-content-between"><span>Parts Total:</span><span className="fw-bold">₹{partsTotal}</span></div>
                                <div className="d-flex justify-content-between align-items-center my-2">
                                    <span>Service Charge (Labor):</span>
                                    <input type="number" className="form-control form-control-sm w-25 text-end" value={form.service_charge} onChange={e => setForm({...form, service_charge: e.target.value})} />
                                </div>
                                <div className="d-flex justify-content-between h4 fw-bold text-success border-top pt-2">
                                    <span>Grand Total:</span><span>₹{grandTotal}</span>
                                </div>
                                <button className="btn btn-success w-100 mt-3 fw-bold py-2" onClick={handleSubmit}>✅ SAVE & CLOSE JOB</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HISTORY VIEW */}
            {view === 'history' && (
                <div>
                    <input className="form-control w-50 mb-3" placeholder="Search Vehicle No..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
                    {loading ? <Loader /> : (
                        <div className="table-responsive bg-white shadow-sm border">
                            <table className="table table-hover mb-0">
                                <thead className="table-dark">
                                    <tr><th>Job #</th><th>Date</th><th>Vehicle</th><th>Mechanic</th><th>Parts</th><th>Total</th></tr>
                                </thead>
                                <tbody>
                                    {repairs.map(r => (
                                        <tr key={r.id}>
                                            <td>{r.job_number}</td>
                                            <td>{new Date(r.created_at).toLocaleDateString()}</td>
                                            <td className="fw-bold">{r.vehicle_number}</td>
                                            <td>{r.staff?.name}</td>
                                            <td>{r.items.length} items (₹{r.total_parts_cost})</td>
                                            <td className="fw-bold text-success">₹{r.grand_total}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* QUICK STOCK MODAL */}
            <Modal show={showStockModal} onHide={() => setShowStockModal(false)} centered>
                <Modal.Header closeButton className="bg-warning">
                    <Modal.Title>⚡ Quick Stock Update</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="fw-bold mb-3">{pendingItem?.item_name}</p>
                    <div className="row g-2">
                        <div className="col-6">
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold">New Stock Quantity *</Form.Label>
                                <Form.Control type="number" value={quickStock} onChange={e => setQuickStock(e.target.value)} autoFocus required />
                            </Form.Group>
                        </div>
                        <div className="col-6">
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold">Selling Price *</Form.Label>
                                <Form.Control type="number" value={quickPrice} onChange={e => setQuickPrice(e.target.value)} required />
                            </Form.Group>
                        </div>
                    </div>
                    <Form.Group className="mb-3">
                        <Form.Label className="small text-muted">Purchase Price (Optional)</Form.Label>
                        <Form.Control type="number" placeholder="Update cost price if changed" value={quickPurchasePrice} onChange={e => setQuickPurchasePrice(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowStockModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleQuickUpdate}>Update & Add to Job</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default RepairManager;
