import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import Loader from './Loader';

const BillingManager = () => {
    // Data States
    const [items, setItems] = useState([]);
    const [allCustomers, setAllCustomers] = useState([]); // Store ALL (B2B + Walkins)
    const [b2bRetailers, setB2bRetailers] = useState([]); // Only B2B for dropdown
    const [filteredRetailers, setFilteredRetailers] = useState([]); // For B2B Search
    const [loading, setLoading] = useState(true);

    // Cart State
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Customer Selection State
    const [customerType, setCustomerType] = useState('walkin'); // 'walkin' or 'retailer'
    const [selectedRetailer, setSelectedRetailer] = useState(null);
    const [retailerSearch, setRetailerSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Walk-in Form State
    const [customerDetails, setCustomerDetails] = useState({ name: '', phone: '' });
    const [walkinSuggestions, setWalkinSuggestions] = useState([]); // Autocomplete list
    const [activeField, setActiveField] = useState(''); // 'name' or 'phone'

    // Payment State
    const [discount, setDiscount] = useState(0);
    const [paidAmount, setPaidAmount] = useState(0);
    const [paymentMode, setPaymentMode] = useState('cash');

    // Click outside handler to close dropdowns
    const wrapperRef = useRef(null);
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
                setWalkinSuggestions([]); // Close walkin suggestions too
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    // 1. Load Data
    const loadData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [itemRes, usersRes] = await Promise.all([
                api.get('/items?page=1', { headers }),
                api.get('/shop-users?type=retailer', { headers }) // Fetches ALL Role 5
            ]);

            if (itemRes.data.status) setItems(itemRes.data.data.data);

            if (usersRes.data.status) {
                const allUsers = usersRes.data.data;
                setAllCustomers(allUsers); // Save everyone for Walk-in Search

                // Filter for B2B Dropdown (Strict Type)
                const b2bList = allUsers.filter(r => {
                    const type = r.retailer_detail?.customer_type || 'b2b';
                    return type === 'b2b';
                });
                setB2bRetailers(b2bList);
                setFilteredRetailers(b2bList);
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // 2. Walk-in Auto-Complete Logic
    const handleWalkinSearch = (val, field) => {
        setCustomerDetails(prev => ({ ...prev, [field]: val }));
        setActiveField(field);

        if (val.length < 2) {
            setWalkinSuggestions([]);
            return;
        }

        const lowerVal = val.toLowerCase();

        // Filter from ALL customers (so you can find B2B people in walk-in tab too if needed)
        const matches = allCustomers.filter(c =>
            c.name.toLowerCase().includes(lowerVal) ||
            c.phone.includes(lowerVal)
        );

        setWalkinSuggestions(matches);
    };

    const selectWalkinCustomer = (c) => {
        setCustomerDetails({ name: c.name, phone: c.phone });
        setWalkinSuggestions([]); // Close list
    };

    // 3. B2B Retailer Search Logic
    const handleRetailerInput = (e) => {
        const val = e.target.value;
        setRetailerSearch(val);
        setIsDropdownOpen(true);
        setSelectedRetailer(null);

        const lowerVal = val.toLowerCase();
        const filtered = b2bRetailers.filter(r =>
            (r.retailer_detail?.retailer_shop_name && r.retailer_detail.retailer_shop_name.toLowerCase().includes(lowerVal)) ||
            r.name.toLowerCase().includes(lowerVal) ||
            r.phone.includes(val)
        );
        setFilteredRetailers(filtered);
    };

    const selectRetailer = (r) => {
        setSelectedRetailer(r);
        setRetailerSearch(`${r.retailer_detail?.retailer_shop_name} (${r.name})`);
        setIsDropdownOpen(false);
    };

    // 4. Cart Logic
    const addToCart = (item) => {
        if (item.stock_quantity <= 0) { toast.error('Out of Stock!'); return; }
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            if (existing.quantity + 1 > item.stock_quantity) { toast.warning('Max stock reached'); return; }
            setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, { ...item, quantity: 1 }]);
        }
    };

    const removeFromCart = (id) => setCart(cart.filter(c => c.id !== id));

    const updateQty = (id, newQty, maxStock) => {
        if (newQty < 1) return;
        if (newQty > maxStock) { toast.warning('Not enough stock'); return; }
        setCart(cart.map(c => c.id === id ? { ...c, quantity: parseInt(newQty) } : c));
    };

    const totalAmount = cart.reduce((acc, item) => acc + (item.selling_price * item.quantity), 0);
    const grandTotal = totalAmount - discount;

    // 5. Checkout
    const handleCheckout = async () => {
        if (cart.length === 0) return toast.error('Cart is empty');
        if (customerType === 'walkin' && !customerDetails.phone) return toast.error('Phone number required');
        if (customerType === 'retailer' && !selectedRetailer) return toast.error('Select a Retailer');

        const payload = {
            customer_type: customerType,
            customer_id: customerType === 'retailer' ? selectedRetailer.id : null,
            customer_name: customerType === 'walkin' ? customerDetails.name : null,
            customer_phone: customerType === 'walkin' ? customerDetails.phone : null,
            items: cart.map(i => ({ id: i.id, quantity: i.quantity })),
            discount: parseFloat(discount),
            paid_amount: parseFloat(paidAmount),
            payment_mode: paymentMode
        };

        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/invoices', payload, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.status) {
                toast.success('Invoice Generated! 🧾');
                setCart([]);
                setDiscount(0);
                setPaidAmount(0);
                setCustomerDetails({ name: '', phone: '' });
                setSelectedRetailer(null);
                setRetailerSearch('');
                loadData();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Checkout Failed');
        }
    };

    return (
        <div className="row h-100">
            {/* LEFT: ITEMS */}
            <div className="col-md-7 border-end">
                <div className="p-3">
                    <h4>New Sale</h4>
                    <input type="text" className="form-control mb-3" placeholder="🔍 Search Item..." onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}/>

                    {loading ? <Loader /> : (
                        <div className="row g-2" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {items.filter(i => i.item_name.toLowerCase().includes(searchTerm)).map(item => (
                                <div className="col-md-4 col-sm-6" key={item.id}>
                                    <div className={`card h-100 shadow-sm ${item.stock_quantity === 0 ? 'bg-light' : 'cursor-pointer'}`} onClick={() => addToCart(item)}>
                                        <div className="card-body p-2 text-center">
                                            <h6 className="card-title text-truncate">{item.item_name}</h6>
                                            <div className="d-flex justify-content-between align-items-center mt-2">
                                                <span className="fw-bold text-primary">₹{item.selling_price}</span>
                                                <span className={`badge ${item.stock_quantity > 0 ? 'bg-success' : 'bg-danger'}`}>Qty: {item.stock_quantity}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: CART */}
            <div className="col-md-5 bg-white d-flex flex-column h-100">
                <div className="p-3 flex-grow-1 overflow-auto">
                    <h5 className="border-bottom pb-2">Current Bill</h5>

                    <div className="mb-3">
                        <div className="btn-group w-100 mb-2">
                            <button className={`btn ${customerType === 'walkin' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setCustomerType('walkin')}>Walk-in</button>
                            <button className={`btn ${customerType === 'retailer' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setCustomerType('retailer')}>Retailer (B2B)</button>
                        </div>

                        {/* WALK-IN SEARCH INPUTS */}
                        {customerType === 'walkin' && (
                            <div className="position-relative" ref={wrapperRef}>
                                <div className="row g-1">
                                    <div className="col-6">
                                        <input
                                            className="form-control form-control-sm"
                                            placeholder="Cust Name"
                                            value={customerDetails.name}
                                            onChange={e => handleWalkinSearch(e.target.value, 'name')}
                                        />
                                    </div>
                                    <div className="col-6">
                                        <input
                                            className="form-control form-control-sm"
                                            placeholder="Phone"
                                            value={customerDetails.phone}
                                            onChange={e => handleWalkinSearch(e.target.value, 'phone')}
                                        />
                                    </div>
                                </div>

                                {/* LIVE SUGGESTIONS DROPDOWN */}
                                {walkinSuggestions.length > 0 && (
                                    <div className="list-group position-absolute w-100 shadow mt-1 bg-white border" style={{zIndex: 1050}}>
                                        {walkinSuggestions.slice(0, 5).map(c => (
                                            <button
                                                key={c.id}
                                                className="list-group-item list-group-item-action p-2 small"
                                                onClick={() => selectWalkinCustomer(c)}
                                            >
                                                {/* Logic: Show what user typed + the other detail */}
                                                {activeField === 'name'
                                                    ? <span><strong>{c.name}</strong> - {c.phone}</span>
                                                    : <span><strong>{c.phone}</strong> - {c.name}</span>
                                                }
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* B2B SEARCH */}
                        {customerType === 'retailer' && (
                            <div className="position-relative" ref={wrapperRef}>
                                <div className="input-group">
                                    <input
                                        type="text" className="form-control" placeholder="Type Shop Name..."
                                        value={retailerSearch}
                                        onChange={handleRetailerInput}
                                        onClick={() => setIsDropdownOpen(true)}
                                    />
                                    <button className="btn btn-outline-secondary" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>▼</button>
                                </div>
                                {isDropdownOpen && (
                                    <div className="list-group position-absolute w-100 shadow mt-1" style={{zIndex: 1000, maxHeight: '200px', overflowY: 'auto'}}>
                                        {filteredRetailers.map(r => (
                                            <button key={r.id} className="list-group-item list-group-item-action" onClick={() => selectRetailer(r)}>
                                                <strong>{r.retailer_detail?.retailer_shop_name}</strong> <br/>
                                                <small>{r.name} - {r.phone}</small>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <table className="table table-sm">
                        <thead className="table-light"><tr><th>Item</th><th>Qty</th><th>Price</th><th></th></tr></thead>
                        <tbody>
                            {cart.map(item => (
                                <tr key={item.id}>
                                    <td>{item.item_name}</td>
                                    <td style={{ width: '80px' }}><input type="number" className="form-control form-control-sm p-1" value={item.quantity} onChange={(e) => updateQty(item.id, e.target.value, item.stock_quantity)} /></td>
                                    <td>₹{item.selling_price * item.quantity}</td>
                                    <td><button className="btn btn-sm text-danger" onClick={() => removeFromCart(item.id)}>×</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-3 bg-light border-top">
                    <div className="d-flex justify-content-between"><span>Subtotal:</span><span className="fw-bold">₹{totalAmount}</span></div>
                    <div className="d-flex justify-content-between align-items-center my-1"><span>Discount:</span><input type="number" className="form-control form-control-sm w-25 text-end" value={discount} onChange={e => setDiscount(e.target.value)} /></div>
                    <div className="d-flex justify-content-between fs-5 fw-bold text-dark border-top pt-1"><span>Grand Total:</span><span>₹{grandTotal}</span></div>

                    <div className="row g-2 mt-2">
                        <div className="col-6"><label className="small">Paid Amount</label><input type="number" className="form-control" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} /></div>
                        <div className="col-6"><label className="small">Payment Mode</label><select className="form-select" onChange={e => setPaymentMode(e.target.value)}><option value="cash">Cash</option><option value="online">Online / UPI</option><option value="credit">Credit</option></select></div>
                    </div>
                    <button className="btn btn-success w-100 mt-3 py-2 fw-bold" onClick={handleCheckout}>CONFIRM & PRINT BILL</button>
                </div>
            </div>
        </div>
    );
};

export default BillingManager;
