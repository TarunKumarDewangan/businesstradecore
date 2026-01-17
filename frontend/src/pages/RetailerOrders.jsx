import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import Loader from '../components/Loader';
import { Modal, Button, Accordion, Badge, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';

const RetailerOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Return Modal State
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [selectedReturnItem, setSelectedReturnItem] = useState(null);
    const [selectedReturnOrderId, setSelectedReturnOrderId] = useState(null);
    const [returnQty, setReturnQty] = useState(1);
    const [reason, setReason] = useState('');

    // Edit Order Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editOrderData, setEditOrderData] = useState(null);
    const [editItems, setEditItems] = useState([]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/order/my-history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) setOrders(res.data.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrders(); }, []);

    // --- CANCEL LOGIC ---
    const handleCancelOrder = async (id) => {
        if(!window.confirm('Are you sure you want to cancel this order?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await api.post(`/order/${id}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) {
                toast.success('Order Cancelled');
                fetchOrders();
            }
        } catch (error) { toast.error(error.response?.data?.message || 'Failed'); }
    };

    // --- EDIT LOGIC ---
    const openEditModal = (order) => {
        setEditOrderData(order);
        // Clone items for editing
        setEditItems(order.items.map(i => ({
            item_id: i.item_id,
            item_name: i.item.item_name,
            quantity: i.requested_qty
        })));
        setShowEditModal(true);
    };

    const handleQuantityChange = (itemId, val) => {
        setEditItems(editItems.map(i => i.item_id === itemId ? { ...i, quantity: parseInt(val) } : i));
    };

    const saveOrderChanges = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.post(`/order/${editOrderData.id}/update`, {
                items: editItems
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.status) {
                toast.success('Order Updated Successfully');
                setShowEditModal(false);
                fetchOrders();
            }
        } catch (error) { toast.error('Update Failed'); }
    };

    // --- RETURN LOGIC ---
    const openReturnModal = (orderId, item) => {
        setSelectedReturnOrderId(orderId);
        setSelectedReturnItem(item);
        setReturnQty(1);
        setShowReturnModal(true);
    };

    const submitReturn = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/return/request', {
                order_id: selectedReturnOrderId,
                item_id: selectedReturnItem.item_id,
                quantity: returnQty,
                reason: reason
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.status) {
                toast.success('Return Request Sent! ↩️');
                setShowReturnModal(false);
            }
        } catch (error) { toast.error('Failed'); }
    };

    const getStatusVariant = (status) => {
        switch(status) {
            case 'pending': return 'warning';
            case 'processing': return 'info';
            case 'dispatched': return 'primary';
            case 'delivered': return 'success';
            case 'cancelled': return 'danger';
            case 'returned': return 'secondary';
            default: return 'secondary';
        }
    };

    return (
        <div>
            <h4 className="mb-4">My Orders</h4>

            {loading ? <Loader /> : (
                <Accordion defaultActiveKey="0">
                    {orders.length === 0 ? <p className="text-center">No orders found.</p> : null}

                    {orders.map((order, index) => (
                        <Accordion.Item eventKey={String(index)} key={order.id}>
                            <Accordion.Header>
                                <div className="d-flex w-100 justify-content-between me-3 align-items-center">
                                    <span>
                                        <strong>#{order.order_number}</strong>
                                        <span className="text-muted ms-2 small">
                                            ({new Date(order.created_at).toLocaleDateString()})
                                        </span>
                                    </span>
                                    <div className="d-flex align-items-center gap-2">
                                        <Badge bg={getStatusVariant(order.status)}>
                                            {order.status.toUpperCase()}
                                        </Badge>

                                        {/* EDIT / DELETE BUTTONS (Only if Pending) */}
                                        {order.status === 'pending' && (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Button size="sm" variant="outline-dark" className="me-1" onClick={() => openEditModal(order)}>✏️</Button>
                                                <Button size="sm" variant="outline-danger" onClick={() => handleCancelOrder(order.id)}>🗑️</Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Accordion.Header>
                            <Accordion.Body className="p-0">
                                <div className="table-responsive">
                                    <table className="table table-sm mb-0">
                                        <thead className="table-light">
                                            <tr><th>Item</th><th className="text-center">Qty</th><th className="text-center">Price</th><th className="text-end">Action</th></tr>
                                        </thead>
                                        <tbody>
                                            {order.items.map(item => (
                                                <tr key={item.id}>
                                                    <td>{item.item.item_name}</td>
                                                    <td className="text-center">{item.fulfilled_qty || item.requested_qty}</td>
                                                    <td className="text-center">₹{item.unit_price}</td>
                                                    <td className="text-end">
                                                        {order.status === 'dispatched' && (
                                                            <Button variant="outline-danger" size="sm" onClick={() => openReturnModal(order.id, item)}>Return</Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {order.driver_name && (
                                    <div className="bg-light p-2 small text-muted border-top">
                                        🚚 Driver: {order.driver_name} {order.vehicle_details ? `(${order.vehicle_details})` : ''}
                                    </div>
                                )}
                            </Accordion.Body>
                        </Accordion.Item>
                    ))}
                </Accordion>
            )}

            {/* EDIT ORDER MODAL */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Modal.Header closeButton><Modal.Title>Modify Order</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p className="small text-muted">You can change quantity or set to 0 to remove item.</p>
                    {editItems.map((item) => (
                        <div className="d-flex justify-content-between align-items-center mb-2" key={item.item_id}>
                            <span>{item.item_name}</span>
                            <input
                                type="number"
                                className="form-control form-control-sm w-25"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(item.item_id, e.target.value)}
                            />
                        </div>
                    ))}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={saveOrderChanges}>Save Changes</Button>
                </Modal.Footer>
            </Modal>

            {/* RETURN MODAL */}
            <Modal show={showReturnModal} onHide={() => setShowReturnModal(false)} centered>
                <Modal.Header closeButton><Modal.Title>Return Item</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p>Item: <strong>{selectedReturnItem?.item.item_name}</strong></p>
                    <Form.Group className="mb-3">
                        <Form.Label>Quantity</Form.Label>
                        <Form.Control type="number" value={returnQty} onChange={e => setReturnQty(e.target.value)} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Reason</Form.Label>
                        <Form.Control type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Damaged, Wrong..." />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowReturnModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={submitReturn}>Submit Return</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default RetailerOrders;
