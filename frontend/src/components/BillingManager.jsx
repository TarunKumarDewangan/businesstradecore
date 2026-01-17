import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import Loader from './Loader';
import { useLocation, useNavigate } from 'react-router-dom';
import { Modal, Button, Form } from 'react-bootstrap';

const BillingManager = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const invoiceToEdit = location.state?.invoiceToEdit || null;

    // Data States
    const [items, setItems] = useState([]);
    const [allRetailers, setAllRetailers] = useState([]);
    const [filteredRetailers, setFilteredRetailers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Cart & UI
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [customerType, setCustomerType] = useState('walkin');
    const [selectedRetailer, setSelectedRetailer] = useState(null);
    const [retailerSearch, setRetailerSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const [customerDetails, setCustomerDetails] = useState({ name: '', phone: '' });
    const [walkinSuggestions, setWalkinSuggestions] = useState([]);
    const [allCustomers, setAllCustomers] = useState([]);

    // Payment
    const [discount, setDiscount] = useState(0);
    const [paidAmount, setPaidAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('cash');
    const [isOrderRequest, setIsOrderRequest] = useState(false);

    // QUICK STOCK MODAL STATE
    const [showStockModal, setShowStockModal] = useState(false);
    const [pendingItem, setPendingItem] = useState(null);
    const [quickStock, setQuickStock] = useState('');
    const [quickPrice, setQuickPrice] = useState('');
    const [quickPurchasePrice, setQuickPurchasePrice] = useState(''); // Optional

    const wrapperRef = useRef(null);

    const totalAmount = cart.reduce((acc, item) => acc + (item.selling_price * item.quantity), 0);
    const grandTotal = totalAmount - discount;

    const handlePaymentModeChange = (mode) => {
        setPaymentMode(mode);
        if (mode === 'credit') setPaidAmount(0);
        else setPaidAmount('');
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
                setWalkinSuggestions([]);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const loadData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [itemRes, retRes] = await Promise.all([
                api.get('/items?page=1', { headers }),
                api.get('/shop-users?type=retailer', { headers })
            ]);

            if (itemRes.data.status) setItems(itemRes.data.data.data);

            if (retRes.data.status) {
                const users = retRes.data.data;
                setAllCustomers(users);
                const b2bList = users.filter(r => r.retailer_detail?.customer_type === 'b2b');
                setAllRetailers(b2bList);
                setFilteredRetailers(b2bList);

                if (invoiceToEdit) {
                    const existingItems = invoiceToEdit.items.map(i => ({
                        id: i.item_id, item_name: i.item_name, selling_price: parseFloat(i.unit_price), quantity: i.quantity, stock_quantity: 999
                    }));
                    setCart(existingItems);
                    setDiscount(invoiceToEdit.discount);
                    setPaidAmount(invoiceToEdit.paid_amount);
                    setPaymentMode(invoiceToEdit.payment_mode);
                    if (invoiceToEdit.customer && invoiceToEdit.customer.retailer_detail?.customer_type === 'b2b') {
                        setCustomerType('retailer');
                        const retailer = users.find(u => u.id === invoiceToEdit.customer_id);
                        if (retailer) { setSelectedRetailer(retailer); setRetailerSearch(`${retailer.retailer_detail.retailer_shop_name} (${retailer.name})`); }
                    } else {
                        setCustomerType('walkin');
                        setCustomerDetails({ name: invoiceToEdit.customer_name, phone: invoiceToEdit.customer_phone || '' });
                    }
                }
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    // Search Logic
    const handleWalkinSearch = (val, field) => {
        setCustomerDetails(prev => ({ ...prev, [field]: val }));
        if (val.length < 2) { setWalkinSuggestions([]); return; }
        const matches = allCustomers.filter(c => c.name.toLowerCase().includes(val.toLowerCase()) || c.phone.includes(val));
        setWalkinSuggestions(matches);
    };
    const selectWalkin = (c) => { setCustomerDetails({ name: c.name, phone: c.phone }); setWalkinSuggestions([]); };
    const handleRetailerInput = (e) => {
        const val = e.target.value; setRetailerSearch(val); setIsDropdownOpen(true); setSelectedRetailer(null);
        const filtered = allRetailers.filter(r => r.retailer_detail?.retailer_shop_name.toLowerCase().includes(val.toLowerCase()) || r.name.toLowerCase().includes(val.toLowerCase()) || r.phone.includes(val));
        setFilteredRetailers(filtered);
    };
    const selectRetailer = (r) => { setSelectedRetailer(r); setRetailerSearch(`${r.retailer_detail?.retailer_shop_name} (${r.name})`); setIsDropdownOpen(false); };

    // --- CART LOGIC ---
    const addToCart = (item) => {
        // CHECK: If Stock/Price 0 -> Open Quick Update Modal
        if (item.stock_quantity <= 0 || item.selling_price <= 0) {
            setPendingItem(item);
            setQuickStock(item.stock_quantity > 0 ? item.stock_quantity : '');
            setQuickPrice(item.selling_price > 0 ? item.selling_price : '');
            setQuickPurchasePrice(''); // Reset optional field
            setShowStockModal(true);
            return;
        }
        addItemToCartState(item);
    };

    const addItemToCartState = (item) => {
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            if (existing.quantity + 1 > item.stock_quantity) { toast.warning('Max stock reached'); return; }
            setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else { setCart([...cart, { ...item, quantity: 1 }]); }
    };

    const removeFromCart = (id) => setCart(cart.filter(c => c.id !== id));
    const updateQty = (id, newQty) => {
        setCart(cart.map(c => c.id === id ? { ...c, quantity: parseInt(newQty) } : c));
    };

    // --- QUICK STOCK UPDATE ---
    const handleQuickUpdate = async () => {
        if (!quickStock || !quickPrice) return toast.warning('Enter Stock and Selling Price');

        try {
            const token = localStorage.getItem('token');

            const updateData = {
                ...pendingItem,
                stock_quantity: parseInt(quickStock),
                selling_price: parseFloat(quickPrice)
            };

            // Optional Purchase Price
            if (quickPurchasePrice) {
                updateData.purchase_price = parseFloat(quickPurchasePrice);
            }

            const res = await api.put(`/items/${pendingItem.id}`, updateData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.status) {
                toast.success('Stock Updated! Added to Cart.');
                const updatedItem = { ...pendingItem, ...updateData };
                setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
                addItemToCartState(updatedItem);
                setShowStockModal(false);
            }
        } catch (err) { toast.error('Update Failed'); }
    };

    // Checkout
    const handleCheckout = async () => {
        if (cart.length === 0) return toast.error('Cart is empty');
        if (isOrderRequest) {
             if (customerType !== 'retailer' || !selectedRetailer) return toast.error('Select Retailer for Order');
             try {
                const token = localStorage.getItem('token');
                const res = await api.post('/order/manual', { retailer_id: selectedRetailer.id, items: cart.map(i => ({ id: i.id, quantity: i.quantity })) }, { headers: { Authorization: `Bearer ${token}` } });
                if (res.data.status) { toast.success('Order Created!'); setCart([]); navigate('/master/orders'); }
             } catch(e) { toast.error('Failed'); }
             return;
        }

        if (customerType === 'walkin' && !customerDetails.phone) return toast.error('Phone required');
        if (customerType === 'retailer' && !selectedRetailer) return toast.error('Select Retailer');
        const amount = parseFloat(paidAmount);
        if (paymentMode !== 'credit') { if (!paidAmount || isNaN(amount) || amount <= 0) return toast.error(`Enter amount for ${paymentMode}`); }

        const payload = {
            customer_type: customerType,
            customer_id: customerType === 'retailer' ? selectedRetailer.id : null,
            customer_name: customerType === 'walkin' ? customerDetails.name : null,
            customer_phone: customerType === 'walkin' ? customerDetails.phone : null,
            items: cart.map(i => ({ id: i.id, quantity: i.quantity })),
            discount: parseFloat(discount),
            paid_amount: amount || 0,
            payment_mode: paymentMode
        };

        try {
            const token = localStorage.getItem('token');
            let res;
            if (invoiceToEdit) res = await api.put(`/invoices/${invoiceToEdit.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
            else res = await api.post('/invoices', payload, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.status) {
                toast.success(invoiceToEdit ? 'Updated!' : 'Generated!');
                if (invoiceToEdit) navigate('/master/history');
                else { setCart([]); setDiscount(0); setPaidAmount(''); setCustomerDetails({ name: '', phone: '' }); setSelectedRetailer(null); setRetailerSearch(''); loadData(); }
            }
        } catch (err) { toast.error('Failed'); }
    };

    return (
        <div className="row h-100">
            {invoiceToEdit && <div className="col-12 bg-warning p-2 text-center fw-bold text-dark">⚠️ EDITING INVOICE #{invoiceToEdit.invoice_number}</div>}

            <div className="col-md-7 border-end">
                <div className="p-3">
                    <h4>{invoiceToEdit ? 'Modify Items' : 'New Sale'}</h4>
                    <input type="text" className="form-control mb-3" placeholder="🔍 Search Item..." onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}/>
                    {loading ? <Loader /> : (
                        <div className="row g-2" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {items.filter(i => i.item_name.toLowerCase().includes(searchTerm)).map(item => (
                                <div className="col-md-4 col-sm-6" key={item.id}>
                                    {/* Updated Click Logic for Stock Check */}
                                    <div className={`card h-100 shadow-sm cursor-pointer border-${item.stock_quantity === 0 ? 'danger' : 'light'}`} onClick={() => addToCart(item)}>
                                        <div className="card-body p-2 text-center">
                                            <h6 className="card-title text-truncate">{item.item_name}</h6>
                                            <div className="d-flex justify-content-between align-items-center mt-2">
                                                <span className="fw-bold text-primary">₹{item.selling_price}</span>
                                                <span className={`badge ${item.stock_quantity > 0 ? 'bg-success' : 'bg-danger'}`}>Qty: {item.stock_quantity}</span>
                                            </div>
                                            {item.stock_quantity === 0 && <small className="text-danger d-block mt-1">Click to add stock</small>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="col-md-5 bg-white d-flex flex-column h-100">
                <div className="p-3 flex-grow-1 overflow-auto">
                    <h5 className="border-bottom pb-2">Current Bill</h5>
                    {!invoiceToEdit && (
                        <div className="form-check form-switch mb-2">
                            <input className="form-check-input" type="checkbox" id="orderSwitch" checked={isOrderRequest} onChange={(e) => setIsOrderRequest(e.target.checked)} />
                            <label className="form-check-label small fw-bold text-primary" htmlFor="orderSwitch">Save as Order Request</label>
                        </div>
                    )}
                    <div className="mb-3">
                        <div className="btn-group w-100 mb-2">
                            <button className={`btn ${customerType === 'walkin' ? 'btn-dark' : 'btn-outline-dark'}`} disabled={isOrderRequest} onClick={() => setCustomerType('walkin')}>Walk-in</button>
                            <button className={`btn ${customerType === 'retailer' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setCustomerType('retailer')}>Retailer (B2B)</button>
                        </div>
                        {customerType === 'walkin' ? (
                             !isOrderRequest && <div className="position-relative" ref={wrapperRef}>
                                <div className="row g-1">
                                    <div className="col-6"><input className="form-control form-control-sm" placeholder="Name" value={customerDetails.name} onChange={e => handleWalkinSearch(e.target.value, 'name')} /></div>
                                    <div className="col-6"><input className="form-control form-control-sm" placeholder="Phone" value={customerDetails.phone} onChange={e => handleWalkinSearch(e.target.value, 'phone')} /></div>
                                </div>
                                {walkinSuggestions.length > 0 && <div className="list-group position-absolute w-100 shadow mt-1 bg-white" style={{zIndex:100}}>{walkinSuggestions.map(c => <button key={c.id} className="list-group-item list-group-item-action p-2" onClick={() => selectWalkin(c)}>{c.name} - {c.phone}</button>)}</div>}
                             </div>
                        ) : (
                             <div className="position-relative" ref={wrapperRef}>
                                <div className="input-group">
                                    <input className="form-control" placeholder="Type Shop Name..." value={retailerSearch} onChange={handleRetailerInput} onClick={() => setIsDropdownOpen(true)} />
                                    <button className="btn btn-outline-secondary" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>▼</button>
                                </div>
                                {isDropdownOpen && <div className="list-group position-absolute w-100 shadow mt-1 bg-white" style={{zIndex:100}}>{filteredRetailers.map(r => <button key={r.id} className="list-group-item list-group-item-action p-2" onClick={() => selectRetailer(r)}>{r.retailer_detail?.retailer_shop_name}</button>)}</div>}
                             </div>
                        )}
                    </div>
                    <table className="table table-sm">
                        <thead className="table-light"><tr><th>Item</th><th>Qty</th><th>Price</th><th></th></tr></thead>
                        <tbody>
                            {cart.map(item => (
                                <tr key={item.id}>
                                    <td>{item.item_name}</td>
                                    <td><input type="number" className="form-control form-control-sm p-1" style={{width:'60px'}} value={item.quantity} onChange={(e) => updateQty(item.id, e.target.value)} /></td>
                                    <td>₹{item.selling_price * item.quantity}</td>
                                    <td><button className="btn btn-sm text-danger" onClick={() => removeFromCart(item.id)}>×</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 bg-light border-top">
                    {!isOrderRequest ? (
                        <>
                            <div className="d-flex justify-content-between"><span>Subtotal:</span><span className="fw-bold">₹{totalAmount}</span></div>
                            <div className="d-flex justify-content-between align-items-center my-1"><span>Discount:</span><input type="number" className="form-control form-control-sm w-25 text-end" value={discount} onChange={e => setDiscount(e.target.value)} /></div>
                            <div className="d-flex justify-content-between fs-5 fw-bold text-dark border-top pt-1"><span>Grand Total:</span><span>₹{grandTotal}</span></div>
                            <div className="row g-2 mt-2">
                                <div className="col-6"><label className="small">Paid</label><input type="number" className="form-control" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} /></div>
                                <div className="col-6"><label className="small">Mode</label><select className="form-select" value={paymentMode} onChange={e => handlePaymentModeChange(e.target.value)}><option value="cash">Cash</option><option value="credit">Credit</option></select></div>
                            </div>
                        </>
                    ) : <div className="alert alert-info py-2 small mb-2">Creates Pending Order. No Stock Deducted.</div>}
                    <button className={`btn w-100 mt-3 py-2 fw-bold ${isOrderRequest ? 'btn-primary' : 'btn-success'}`} onClick={handleCheckout}>{isOrderRequest ? 'SAVE ORDER REQUEST' : (invoiceToEdit ? 'UPDATE BILL' : 'CONFIRM & PRINT BILL')}</button>
                    {invoiceToEdit && <button className="btn btn-secondary w-100 mt-2 btn-sm" onClick={() => navigate('/master/history')}>Cancel Edit</button>}
                </div>
            </div>

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
                    {/* OPTIONAL PURCHASE PRICE */}
                    <Form.Group className="mb-3">
                        <Form.Label className="small text-muted">Purchase Price (Optional)</Form.Label>
                        <Form.Control type="number" placeholder="Update cost price if changed" value={quickPurchasePrice} onChange={e => setQuickPurchasePrice(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowStockModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleQuickUpdate}>Update & Add to Cart</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default BillingManager;
