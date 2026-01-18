import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import Loader from './Loader';
import { Modal, Button, Form } from 'react-bootstrap';

const IncomingOrders = () => {
    const [orders, setOrders] = useState([]);
    const [partners, setPartners] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [processItems, setProcessItems] = useState([]);
    const [deliveryType, setDeliveryType] = useState('partner');
    const [driverId, setDriverId] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [ordRes, partRes, staffRes] = await Promise.all([
                api.get(`/order/incoming?status=${filterStatus}`, { headers }),
                api.get('/partners', { headers }),
                api.get('/shop-users?type=staff', { headers })
            ]);

            if (ordRes.data.status) setOrders(ordRes.data.data.data);
            if (partRes.data.status) setPartners(partRes.data.data);
            if (staffRes.data.status) setStaffList(staffRes.data.data);

        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, [filterStatus]);

    // --- ACTIONS ---
    const handleAction = async (id, action) => {
        // Confirmation Messages
        let msg = `Are you sure you want to ${action}?`;
        if(action === 'cancel-dispatch') msg = "⚠️ WARNING: This will Delete the Invoice, Restore Stock, and Reverse Ledger. Continue?";

        if(!window.confirm(msg)) return;

        try {
            const token = localStorage.getItem('token');
            const res = await api.post(`/order/${id}/${action}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) {
                toast.success(res.data.message);
                loadData();
            }
        } catch(e) { toast.error(e.response?.data?.message || 'Action Failed'); }
    };

    // --- DISPATCH LOGIC ---
    const handleProcess = (order) => {
        setSelectedOrder(order);
        setDriverId('');
        setDeliveryType('partner');
        setProcessItems(order.items.map(i => ({
            item_id: i.item.id,
            item_name: i.item?.item_name,
            requested_qty: i.requested_qty,
            fulfilled_qty: i.requested_qty,
            stock: i.item?.stock_quantity
        })));
        setShowModal(true);
    };

    const handleDispatch = async () => {
        if(!driverId) return toast.warning('Select a Driver/Partner');
        try {
            const token = localStorage.getItem('token');
            const payload = {
                items: processItems.map(i => ({ item_id: i.item_id, fulfilled_qty: parseInt(i.fulfilled_qty) })),
                delivery_type: deliveryType, driver_id: driverId
            };
            const res = await api.post(`/order/${selectedOrder.id}/dispatch`, payload, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) {
                toast.success('Order Dispatched!');
                setShowModal(false);
                loadData();
            }
        } catch (error) { toast.error('Failed'); }
    };

    const calculateTotal = (items) => items.reduce((acc, i) => acc + (i.unit_price * i.requested_qty), 0);

    return (
        <div className="mt-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4>🔔 Order Management</h4>
                <select className="form-select w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">All Orders</option>
                    <option value="pending">⏳ Pending</option>
                    <option value="dispatched">🚚 Dispatched</option>
                    <option value="delivered">✅ Delivered</option>
                    <option value="cancelled">❌ Rejected</option>
                </select>
            </div>

            {loading ? <Loader /> : (
                <div className="table-responsive bg-white shadow-sm border rounded">
                    <table className="table table-hover mb-0 align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>Order #</th>
                                <th>Retailer</th>
                                <th>Items Ordered</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th className="text-end">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 ? (
                                <tr><td colSpan="6" className="text-center p-5 text-muted">No Orders Found</td></tr>
                            ) : orders.map(order => (
                                <tr key={order.id}>
                                    <td className="fw-bold text-primary">{order.order_number}</td>
                                    <td><span className="fw-bold">{order.retailer?.name}</span><br/><small className="text-muted">{order.retailer?.phone}</small></td>
                                    <td><small>{order.items.map(i => i.item?.item_name).join(', ').substring(0, 30)}...</small></td>
                                    <td className="fw-bold text-success">₹{calculateTotal(order.items)}</td>
                                    <td>
                                        <span className={`badge ${
                                            order.status === 'pending' ? 'bg-warning text-dark' :
                                            order.status === 'dispatched' ? 'bg-primary' :
                                            order.status === 'delivered' ? 'bg-success' : 'bg-danger'
                                        }`}>
                                            {order.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="text-end">
                                        <div className="btn-group">
                                            {order.status === 'pending' && (
                                                <>
                                                    <button className="btn btn-sm btn-success" onClick={() => handleProcess(order)}>Process</button>
                                                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleAction(order.id, 'reject')}>Reject</button>
                                                </>
                                            )}

                                            {order.status === 'dispatched' && (
                                                <>
                                                    <button className="btn btn-sm btn-success" onClick={() => handleAction(order.id, 'deliver')}>Mark Delivered</button>
                                                    {/* RESET BUTTON */}
                                                    <button className="btn btn-sm btn-outline-secondary" title="Reset to Pending" onClick={() => handleAction(order.id, 'cancel-dispatch')}>↩️ Reset</button>
                                                </>
                                            )}

                                            {order.status === 'delivered' && (
                                                <button className="btn btn-sm btn-outline-secondary" onClick={() => handleAction(order.id, 'revert-delivery')}>
                                                    ↩️ Revert to Dispatched
                                                </button>
                                            )}

                                            {order.status === 'cancelled' && (
                                                <button className="btn btn-sm btn-outline-warning text-dark" onClick={() => handleAction(order.id, 'restore')}>Restore</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* PROCESS MODAL */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" backdrop="static">
                <Modal.Header closeButton><Modal.Title>Process Order</Modal.Title></Modal.Header>
                <Modal.Body>
                    <h6 className="fw-bold mb-3">1. Check Stock & Adjust Quantity</h6>
                    <table className="table table-bordered mb-4">
                        <thead className="table-light"><tr><th>Item</th><th>Requested</th><th>Stock</th><th>Send Qty</th></tr></thead>
                        <tbody>
                            {processItems.map((item, index) => (
                                <tr key={item.item_id}>
                                    <td>{item.item_name}</td>
                                    <td className="text-center">{item.requested_qty}</td>
                                    <td className={`text-center fw-bold ${item.stock < item.fulfilled_qty ? 'text-danger' : 'text-success'}`}>{item.stock}</td>
                                    <td><input type="number" className="form-control form-control-sm text-center fw-bold" value={item.fulfilled_qty} onChange={(e) => { const newItems = [...processItems]; newItems[index].fulfilled_qty = e.target.value; setProcessItems(newItems); }} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <h6 className="fw-bold">2. Assign Delivery</h6>
                    <div className="card p-3 bg-light border-0">
                        <div className="btn-group w-100 mb-3">
                            <input type="radio" className="btn-check" name="dtype" id="d_partner" checked={deliveryType === 'partner'} onChange={() => { setDeliveryType('partner'); setDriverId(''); }} /><label className="btn btn-outline-primary" htmlFor="d_partner">🚚 External</label>
                            <input type="radio" className="btn-check" name="dtype" id="d_staff" checked={deliveryType === 'staff'} onChange={() => { setDeliveryType('staff'); setDriverId(''); }} /><label className="btn btn-outline-primary" htmlFor="d_staff">👤 Staff</label>
                        </div>
                        <Form.Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                            <option value="">-- Select Driver --</option>
                            {deliveryType === 'partner' ? partners.map(p => <option key={p.id} value={p.id}>{p.name} ({p.vehicle_number})</option>) : staffList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>)}
                        </Form.Select>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                    <Button variant="success" onClick={handleDispatch} disabled={!driverId}>Dispatch</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default IncomingOrders;
