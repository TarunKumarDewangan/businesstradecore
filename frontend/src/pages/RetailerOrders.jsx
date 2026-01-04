import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import Loader from '../components/Loader';
import { Modal, Button, Form, Accordion, Badge } from 'react-bootstrap'; // Import Accordion
import { toast } from 'react-toastify';

const RetailerOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Return Modal
    const [showModal, setShowModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [returnQty, setReturnQty] = useState(1);
    const [reason, setReason] = useState('');

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

    const openReturnModal = (orderId, item) => {
        setSelectedOrderId(orderId);
        setSelectedItem(item);
        setReturnQty(1);
        setShowModal(true);
    };

    const submitReturn = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/return/request', {
                order_id: selectedOrderId,
                item_id: selectedItem.item_id,
                quantity: returnQty,
                reason: reason
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.status) {
                toast.success('Return Request Sent! ↩️');
                setShowModal(false);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed');
        }
    };

    const getStatusVariant = (status) => {
        switch(status) {
            case 'pending': return 'warning';
            case 'processing': return 'info';
            case 'dispatched': return 'primary';
            case 'delivered': return 'success';
            case 'returned': return 'secondary'; // Grey for returned
            case 'cancelled': return 'danger';
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
                                <div className="d-flex justify-content-between w-100 me-3 align-items-center">
                                    <span>
                                        <strong>Order #{order.order_number}</strong>
                                        <span className="text-muted ms-2 small">
                                            ({new Date(order.created_at).toLocaleDateString()})
                                        </span>
                                    </span>
                                    <Badge bg={getStatusVariant(order.status)}>
                                        {order.status.toUpperCase()}
                                    </Badge>
                                </div>
                            </Accordion.Header>
                            <Accordion.Body className="p-0">
                                <div className="table-responsive">
                                    <table className="table table-sm mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Item</th>
                                                <th className="text-center">Qty</th>
                                                <th className="text-center">Price</th>
                                                <th className="text-end">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {order.items.map(item => (
                                                <tr key={item.id}>
                                                    <td>{item.item.item_name}</td>
                                                    <td className="text-center">{item.fulfilled_qty || item.requested_qty}</td>
                                                    <td className="text-center">₹{item.unit_price}</td>
                                                    <td className="text-end">
                                                        {order.status === 'dispatched' && (
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                onClick={() => openReturnModal(order.id, item)}
                                                            >
                                                                Return
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {order.driver_name && (
                                    <div className="bg-light p-2 small text-muted border-top">
                                        🚚 Driver: {order.driver_name}
                                    </div>
                                )}
                            </Accordion.Body>
                        </Accordion.Item>
                    ))}
                </Accordion>
            )}

            {/* RETURN MODAL */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton><Modal.Title>Return Item</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p>Item: <strong>{selectedItem?.item.item_name}</strong></p>
                    <Form.Group className="mb-3">
                        <Form.Label>Quantity to Return</Form.Label>
                        <Form.Control type="number" value={returnQty} onChange={e => setReturnQty(e.target.value)} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Reason</Form.Label>
                        <Form.Control type="text" placeholder="Damaged, Wrong Item..." value={reason} onChange={e => setReason(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={submitReturn}>Submit Request</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default RetailerOrders;
