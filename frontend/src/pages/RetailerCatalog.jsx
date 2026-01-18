import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import Loader from '../components/Loader';
import { Modal, Button } from 'react-bootstrap';

const RetailerCatalog = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);

    const fetchCatalog = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Ensure backend returns ALL items, not just stock > 0
            const res = await api.get('/catalog?page=1', { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) setItems(res.data.data.data);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCatalog(); }, []);

    const addToCart = (item) => {
        // ALLOW 0 Stock. It becomes a pre-order request.
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, { ...item, quantity: 1 }]);
        }
        toast.success(`Added ${item.item_name}`);
    };

    const removeFromCart = (id) => setCart(cart.filter(c => c.id !== id));

    const handlePlaceOrder = async () => {
        try {
            const token = localStorage.getItem('token');
            const payload = { items: cart.map(i => ({ id: i.id, quantity: i.quantity })) };
            const res = await api.post('/order/place', payload, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.status) {
                toast.success('Order Request Sent! (Even out-of-stock items) 🚀');
                setCart([]);
                setShowCart(false);
            }
        } catch (error) { toast.error(error.response?.data?.message || 'Failed'); }
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4 sticky-top bg-white py-2 border-bottom">
                <h4>Product Catalog</h4>
                <button className="btn btn-warning position-relative" onClick={() => setShowCart(true)}>
                    🛒 Cart
                    {cart.length > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">{cart.reduce((a,i)=>a+i.quantity,0)}</span>}
                </button>
            </div>

            <input className="form-control mb-4" placeholder="Search parts..." onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}/>

            {loading ? <Loader /> : (
                <div className="row g-3">
                    {items.filter(i => i.item_name.toLowerCase().includes(searchTerm)).map(item => (
                        <div className="col-6 col-md-4 col-lg-3" key={item.id}>
                            <div className={`card h-100 shadow-sm border-0 ${item.stock_quantity <= 0 ? 'bg-light' : ''}`}>
                                <div className="card-body d-flex flex-column">
                                    <h6 className="card-title fw-bold text-primary">{item.item_name}</h6>
                                    <small className="text-muted mb-2">#{item.part_number}</small>
                                    <small className="text-secondary mb-3">{item.compatible_models}</small>

                                    <div className="mt-auto d-flex justify-content-between align-items-center">
                                        <span className="fw-bold">₹{item.selling_price}</span>
                                        <div className="text-end">
                                            {item.stock_quantity <= 0 && <small className="d-block text-danger mb-1" style={{fontSize: '0.7rem'}}>Out of Stock</small>}
                                            <button className={`btn btn-sm ${item.stock_quantity > 0 ? 'btn-outline-primary' : 'btn-warning text-dark'}`} onClick={() => addToCart(item)}>
                                                {item.stock_quantity > 0 ? '+ Add' : 'Pre-Order'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal show={showCart} onHide={() => setShowCart(false)} size="lg">
                <Modal.Header closeButton><Modal.Title>Your Order Cart</Modal.Title></Modal.Header>
                <Modal.Body>
                    {cart.length === 0 ? <p className="text-center text-muted">Cart is empty.</p> :
                    <table className="table">
                        <thead><tr><th>Item</th><th>Qty</th><th>Est Price</th><th></th></tr></thead>
                        <tbody>
                            {cart.map(item => (
                                <tr key={item.id}>
                                    <td>
                                        {item.item_name}
                                        {item.stock_quantity <= 0 && <span className="badge bg-warning text-dark ms-2">Waitlist</span>}
                                    </td>
                                    <td>
                                        <input type="number" className="form-control form-control-sm" style={{width:'60px'}}
                                            value={item.quantity}
                                            onChange={(e) => setCart(cart.map(c => c.id === item.id ? { ...c, quantity: parseInt(e.target.value) || 1 } : c))}
                                        />
                                    </td>
                                    <td>₹{item.selling_price * item.quantity}</td>
                                    <td><button className="btn btn-sm btn-danger" onClick={() => removeFromCart(item.id)}>×</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>}
                    {cart.length > 0 && <div className="text-end fw-bold fs-5">Total Request: ₹{cart.reduce((acc, i) => acc + (i.selling_price * i.quantity), 0)}</div>}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCart(false)}>Close</Button>
                    <Button variant="success" onClick={handlePlaceOrder} disabled={cart.length === 0}>Place Order Request</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};
export default RetailerCatalog;
