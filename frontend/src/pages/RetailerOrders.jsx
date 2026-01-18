import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import Loader from '../components/Loader';
import { Modal, Button, Accordion, Badge, Card, useAccordionButton, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';

// Custom Toggle Component
function CustomToggle({ children, eventKey }) {
    const decoratedOnClick = useAccordionButton(eventKey);
    return (
        <div className="d-flex w-100 align-items-center cursor-pointer" onClick={decoratedOnClick} style={{cursor: 'pointer'}}>
            {children}
        </div>
    );
}

const RetailerOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const refreshSystem = () => { setRefreshKey(prev => prev + 1); };

    // Modal States
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [selectedReturnItem, setSelectedReturnItem] = useState(null);
    const [selectedReturnOrderId, setSelectedReturnOrderId] = useState(null);
    const [maxReturnQty, setMaxReturnQty] = useState(0); // Validation
    const [returnQty, setReturnQty] = useState(1);
    const [reason, setReason] = useState('');

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editOrderData, setEditOrderData] = useState(null);
    const [editItems, setEditItems] = useState([]);

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await api.get('/order/my-history', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.status) setOrders(res.data.data.data);
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        fetchOrders();
    }, [refreshKey]);

    const handleMarkReceived = async (id, e) => {
        e.stopPropagation();
        if(!window.confirm('Confirm receipt?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await api.post(`/order/${id}/received`, {}, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) { toast.success('Marked Received!'); refreshSystem(); }
        } catch (error) { toast.error('Failed'); }
    };

    const handleCancelOrder = async (id, e) => {
        e.stopPropagation();
        if(!window.confirm('Cancel order?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await api.post(`/order/${id}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) { toast.success('Cancelled'); refreshSystem(); }
        } catch (error) { toast.error('Failed'); }
    };

    const openEditModal = (order, e) => {
        e.stopPropagation();
        setEditOrderData(order);
        setEditItems(order.items.map(i => ({ item_id: i.item_id, item_name: i.item.item_name, quantity: i.requested_qty })));
        setShowEditModal(true);
    };

    const handleQuantityChange = (itemId, val) => {
        setEditItems(editItems.map(i => i.item_id === itemId ? { ...i, quantity: parseInt(val) } : i));
    };

    const saveOrderChanges = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.post(`/order/${editOrderData.id}/update`, { items: editItems }, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) { toast.success('Updated'); setShowEditModal(false); refreshSystem(); }
        } catch (error) { toast.error('Failed'); }
    };

    const openReturnModal = (orderId, item, maxQty) => {
        setSelectedReturnOrderId(orderId);
        setSelectedReturnItem(item);
        setMaxReturnQty(maxQty);
        setReturnQty(1);
        setReason('');
        setShowReturnModal(true);
    };

    const submitReturn = async () => {
        if(returnQty > maxReturnQty) { return toast.error(`You only received ${maxReturnQty}, cannot return ${returnQty}!`); }
        if(returnQty <= 0) { return toast.error(`Quantity must be 1 or more`); }

        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/return/request', {
                order_id: selectedReturnOrderId,
                item_id: selectedReturnItem.item_id,
                quantity: returnQty,
                reason: reason
            }, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) { toast.success('Return Sent!'); setShowReturnModal(false); refreshSystem(); }
        } catch (error) { toast.error(error.response?.data?.message || 'Failed'); }
    };

    const getStatusVariant = (status) => {
        switch(status) {
            case 'pending': return 'warning'; case 'processing': return 'info';
            case 'dispatched': return 'primary'; case 'delivered': return 'success';
            case 'cancelled': return 'danger'; case 'returned': return 'secondary';
            default: return 'secondary';
        }
    };

    // --- HELPER: Count Returns for an Item ---
    const getReturnedQty = (order, itemId) => {
        if (!order.return_requests) return 0;
        return order.return_requests
            .filter(r => r.item_id === itemId && r.status !== 'rejected')
            .reduce((sum, r) => sum + r.quantity, 0);
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4>My Orders</h4>
                <Button variant="outline-primary" size="sm" onClick={refreshSystem}>🔄 Refresh</Button>
            </div>

            {loading ? <Loader /> : (
                <Accordion defaultActiveKey="0">
                    {orders.length === 0 ? <p className="text-center text-muted p-4">No orders found.</p> : null}

                    {orders.map((order, index) => (
                        <Card key={order.id} className="mb-2 shadow-sm border-0">
                            <Card.Header className="bg-white p-2">
                                <div className="d-flex align-items-center justify-content-between">
                                    <CustomToggle eventKey={String(index)}>
                                        <div>
                                            <strong>#{order.order_number}</strong>
                                            <span className="text-muted ms-2 small">({new Date(order.created_at).toLocaleDateString()})</span>
                                        </div>
                                    </CustomToggle>

                                    <div className="d-flex align-items-center gap-2">
                                        <Badge bg={getStatusVariant(order.status)}>{order.status.toUpperCase()}</Badge>

                                        {order.status === 'pending' && (
                                            <><Button size="sm" variant="outline-dark" onClick={(e) => openEditModal(order, e)}>✏️</Button>
                                              <Button size="sm" variant="outline-danger" onClick={(e) => handleCancelOrder(order.id, e)}>🗑️</Button></>
                                        )}
                                        {order.status === 'dispatched' && (
                                            <Button size="sm" variant="success" className="fw-bold" onClick={(e) => handleMarkReceived(order.id, e)}>✅ Received</Button>
                                        )}
                                    </div>
                                </div>
                            </Card.Header>
                            <Accordion.Collapse eventKey={String(index)}>
                                <Card.Body className="p-0">
                                    <div className="table-responsive">
                                        <table className="table table-sm mb-0 align-middle">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Item</th>
                                                    <th className="text-center">Ordered</th>
                                                    <th className="text-center">Received</th>
                                                    <th className="text-center text-danger">Returned</th> {/* NEW COLUMN */}
                                                    <th className="text-center">Price</th>
                                                    <th className="text-end">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {order.items.map(item => {
                                                    // CALCULATE REMAINING QTY (Received - Returned)
                                                    const receivedQty = item.fulfilled_qty || 0;
                                                    const returnedQty = getReturnedQty(order, item.item_id);
                                                    const remainingQty = receivedQty - returnedQty;

                                                    return (
                                                        <tr key={item.id}>
                                                            <td>{item.item?.item_name || 'Item Removed'}</td>
                                                            <td className="text-center">{item.requested_qty}</td>
                                                            <td className="text-center fw-bold">
                                                                {order.status === 'pending' ? <span className="text-muted">...</span> :
                                                                 item.fulfilled_qty === 0 ? <span className="badge bg-secondary text-white">0</span> :
                                                                 <span className="text-success">{receivedQty}</span>}
                                                            </td>
                                                            <td className="text-center text-danger fw-bold">
                                                                {returnedQty > 0 ? returnedQty : '-'}
                                                            </td>
                                                            <td className="text-center">₹{item.unit_price}</td>
                                                            <td className="text-end">
                                                                {/* Only Show Return if Status valid AND (Remaining Qty > 0) */}
                                                                {(order.status === 'dispatched' || order.status === 'delivered') && remainingQty > 0 && (
                                                                    <Button variant="outline-danger" size="sm" onClick={() => openReturnModal(order.id, item, remainingQty)}>
                                                                        Return
                                                                    </Button>
                                                                )}
                                                                {/* If full return done, show badge */}
                                                                {receivedQty > 0 && remainingQty <= 0 && <span className="badge bg-danger">Full Returned</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {order.driver_name && (
                                        <div className="bg-light p-2 small text-muted border-top">
                                            🚚 Driver: {order.driver_name} {order.vehicle_details ? `(${order.vehicle_details})` : ''}
                                        </div>
                                    )}
                                </Card.Body>
                            </Accordion.Collapse>
                        </Card>
                    ))}
                </Accordion>
            )}

            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Modal.Header closeButton><Modal.Title>Modify Order</Modal.Title></Modal.Header>
                <Modal.Body>
                    {editItems.map((item) => (
                        <div className="d-flex justify-content-between align-items-center mb-2" key={item.item_id}>
                            <span>{item.item_name}</span>
                            <input type="number" className="form-control form-control-sm w-25" value={item.quantity} onChange={(e) => handleQuantityChange(item.item_id, e.target.value)}/>
                        </div>
                    ))}
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button><Button variant="primary" onClick={saveOrderChanges}>Save</Button></Modal.Footer>
            </Modal>

            <Modal show={showReturnModal} onHide={() => setShowReturnModal(false)} centered>
                <Modal.Header closeButton><Modal.Title>Return Item</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p>Item: <strong>{selectedReturnItem?.item?.item_name}</strong></p>
                    <Form.Group className="mb-3">
                        <Form.Label>Return Qty (Max {maxReturnQty})</Form.Label>
                        <Form.Control type="number" value={returnQty} onChange={e => setReturnQty(e.target.value)} max={maxReturnQty} min={1} />
                    </Form.Group>
                    <Form.Group className="mb-3"><Form.Label>Reason</Form.Label><Form.Control type="text" value={reason} onChange={e => setReason(e.target.value)} /></Form.Group>
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setShowReturnModal(false)}>Cancel</Button><Button variant="danger" onClick={submitReturn}>Submit</Button></Modal.Footer>
            </Modal>
        </div>
    );
};

export default RetailerOrders;
