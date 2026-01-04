import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import Loader from '../components/Loader';
import { Modal, Button } from 'react-bootstrap';

const RetailerCatalog = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Cart State
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);

    // 1. Fetch Catalog
    const fetchCatalog = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/catalog?page=1', { // Fetch all or paginated
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) setItems(res.data.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCatalog(); }, []);

    // 2. Add to Cart Logic
    const addToCart = (item) => {
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, { ...item, quantity: 1 }]);
        }
        toast.success(`Added ${item.item_name}`);
    };

    const removeFromCart = (id) => {
        setCart(cart.filter(c => c.id !== id));
    };

    // 3. Place Order
    const handlePlaceOrder = async () => {
        try {
            const token = localStorage.getItem('token');
            const payload = {
                items: cart.map(i => ({ id: i.id, quantity: i.quantity }))
            };

            const res = await api.post('/order/place', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.status) {
                toast.success('Order Placed Successfully! 🚀');
                setCart([]); // Clear Cart
                setShowCart(false);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Order Failed');
        }
    };

    return (
        <div>
            {/* Header Area */}
            <div className="d-flex justify-content-between align-items-center mb-4 sticky-top bg-white py-2 border-bottom">
                <h4>Product Catalog</h4>
                <button className="btn btn-warning position-relative" onClick={() => setShowCart(true)}>
                    🛒 Cart
                    {cart.length > 0 && (
                        <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                            {cart.reduce((acc, item) => acc + item.quantity, 0)}
                        </span>
                    )}
                </button>
            </div>

            {/* Search */}
            <input
                className="form-control mb-4"
                placeholder="Search parts..."
                onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
            />

            {/* Grid View */}
            {loading ? <Loader /> : (
                <div className="row g-3">
                    {items
                        .filter(i => i.item_name.toLowerCase().includes(searchTerm))
                        .map(item => (
                        <div className="col-6 col-md-4 col-lg-3" key={item.id}>
                            <div className="card h-100 shadow-sm border-0">
                                <div className="card-body d-flex flex-column">
                                    <h6 className="card-title fw-bold text-primary">{item.item_name}</h6>
                                    <small className="text-muted mb-2">#{item.part_number}</small>
                                    <small className="text-secondary mb-3">{item.compatible_models}</small>

                                    <div className="mt-auto d-flex justify-content-between align-items-center">
                                        <span className="fw-bold">₹{item.selling_price}</span>
                                        <button className="btn btn-sm btn-outline-primary" onClick={() => addToCart(item)}>
                                            + Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CART MODAL */}
            <Modal show={showCart} onHide={() => setShowCart(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Your Order Cart</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {cart.length === 0 ? (
                        <p className="text-center text-muted">Cart is empty.</p>
                    ) : (
                        <table className="table">
                            <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th></th></tr></thead>
                            <tbody>
                                {cart.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.item_name}</td>
                                        <td>
                                            <input
                                                type="number" className="form-control form-control-sm" style={{width: '60px'}}
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    setCart(cart.map(c => c.id === item.id ? { ...c, quantity: val } : c));
                                                }}
                                            />
                                        </td>
                                        <td>₹{item.selling_price * item.quantity}</td>
                                        <td><button className="btn btn-sm btn-danger" onClick={() => removeFromCart(item.id)}>×</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {cart.length > 0 && (
                        <div className="text-end fw-bold fs-5">
                            Total Est: ₹{cart.reduce((acc, i) => acc + (i.selling_price * i.quantity), 0)}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCart(false)}>Close</Button>
                    <Button variant="success" onClick={handlePlaceOrder} disabled={cart.length === 0}>Place Order</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default RetailerCatalog;
