import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import Loader from './Loader';
import { Modal, Form, Button } from 'react-bootstrap';

const LedgerManager = () => {
    // Data State
    const [allCustomers, setAllCustomers] = useState([]);
    const [filteredList, setFilteredList] = useState([]);

    // View State: 'b2b' (Retailer) or 'walkin'
    const [viewType, setViewType] = useState('b2b');

    // Selection State
    const [selectedRetailer, setSelectedRetailer] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Ledger Data
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState(0);

    // Modals
    const [showPayModal, setShowPayModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNote, setPaymentNote] = useState('');
    const [newCust, setNewCust] = useState({ name: '', phone: '', shop: '' });

    // Close Dropdown on Click Outside
    const wrapperRef = useRef(null);
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    // 1. Fetch Customers
    const fetchCustomers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/shop-users?type=retailer', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) {
                setAllCustomers(res.data.data);
                // Initial filter based on current viewType
                filterCustomers(res.data.data, viewType, searchTerm);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => { fetchCustomers(); }, []);

    // 2. Strict Filter Logic (Database Flag)
    const filterCustomers = (data, type, search) => {
        const searchLower = search.toLowerCase();

        let list = data.filter(c => {
            // Check Database Type ('b2b' or 'walkin')
            const dbType = c.retailer_detail?.customer_type || 'b2b';

            // Type Filter
            if (type === 'b2b' && dbType !== 'b2b') return false;
            if (type === 'walkin' && dbType !== 'walkin') return false;

            // Search Filter
            if (search === '') return true;

            const shopName = c.retailer_detail?.retailer_shop_name || '';
            const personName = c.name || '';

            return (
                personName.toLowerCase().includes(searchLower) ||
                shopName.toLowerCase().includes(searchLower) ||
                c.phone.includes(search)
            );
        });
        setFilteredList(list);
    };

    // Handle Search Typing
    const handleSearchInput = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        setIsDropdownOpen(true);
        setSelectedRetailer(null);
        setTransactions([]);
        filterCustomers(allCustomers, viewType, val);
    };

    // Handle Tab Switch
    const handleTypeChange = (type) => {
        setViewType(type);
        setSearchTerm('');
        setSelectedRetailer(null);
        setTransactions([]);
        setIsDropdownOpen(false);
        filterCustomers(allCustomers, type, '');
    };

    // Toggle Dropdown
    const toggleDropdown = () => {
        if (!isDropdownOpen) {
            filterCustomers(allCustomers, viewType, '');
            setIsDropdownOpen(true);
        } else {
            setIsDropdownOpen(false);
        }
    };

    // Handle Selection
    const handleSelectUser = (user) => {
        setSelectedRetailer(user);

        // Format Name for Display
        const shopName = user.retailer_detail?.retailer_shop_name;
        const displayName = (viewType === 'b2b')
            ? `${shopName} (${user.name})`
            : `${user.name} - ${user.phone}`;

        setSearchTerm(displayName);
        setIsDropdownOpen(false);
        fetchLedger(user.id);
    };

    // 3. Fetch Ledger
    const fetchLedger = async (retailerId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/ledger?retailer_id=${retailerId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) {
                setTransactions(res.data.data);
                const current = allCustomers.find(r => r.id === retailerId);
                if(current) setBalance(current.retailer_detail?.current_balance);
            }
        } catch (err) {
            toast.error('Failed to load ledger');
        } finally {
            setLoading(false);
        }
    };

    // 4. Submit Payment
    const handlePayment = async (e) => {
        e.preventDefault();
        if(!selectedRetailer) return;
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/ledger/payment', {
                retailer_id: selectedRetailer.id,
                amount: paymentAmount,
                description: paymentNote,
                date: new Date().toISOString().split('T')[0]
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.status) {
                toast.success('Payment Recorded! 💰');
                setShowPayModal(false);
                setPaymentAmount('');
                setPaymentNote('');
                fetchLedger(selectedRetailer.id);
                fetchCustomers(); // Update Balance
                setBalance(prev => prev - parseFloat(paymentAmount));
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment Failed');
        }
    };

    // 5. Add Customer (Auto-detect type from Tab)
    const handleAddCustomer = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const payload = {
                name: newCust.name,
                phone: newCust.phone,
                password: '123',
                retailer_shop_name: newCust.shop || newCust.name,
                type: 'retailer',
                customer_type: viewType // 'b2b' or 'walkin'
            };
            const res = await api.post('/shop-users', payload, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) {
                toast.success(`${viewType === 'b2b' ? 'Retailer' : 'Customer'} Added!`);
                setShowAddModal(false);
                setNewCust({ name: '', phone: '', shop: '' });
                fetchCustomers();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed');
        }
    };

    return (
        <div className="container-fluid mt-3" style={{minHeight: '80vh'}}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4>📒 KHATA BOOK (LEDGER)</h4>
            </div>

            {/* SELECTION CARD */}
            <div className="card shadow-sm p-3 mb-4 bg-light">
                <div className="row g-3">

                    {/* TABS */}
                    <div className="col-md-12">
                        <div className="btn-group w-100 w-md-auto shadow-sm">
                            <button className={`btn ${viewType === 'b2b' ? 'btn-primary' : 'btn-white border'}`}
                                onClick={() => handleTypeChange('b2b')}>🏢 Retailers (B2B)</button>
                            <button className={`btn ${viewType === 'walkin' ? 'btn-success' : 'btn-white border'}`}
                                onClick={() => handleTypeChange('walkin')}>👤 Walk-in Customers</button>
                        </div>
                    </div>

                    {/* SEARCH + DROPDOWN */}
                    <div className="col-md-6 position-relative" ref={wrapperRef}>
                        <label className="form-label fw-bold text-muted small">SEARCH CLIENT</label>
                        <div className="input-group">
                            <input
                                type="text"
                                className="form-control"
                                placeholder={viewType === 'b2b' ? "Type Shop Name..." : "Type Name / Phone..."}
                                value={searchTerm}
                                onChange={handleSearchInput}
                                onClick={() => {
                                    if(!isDropdownOpen) toggleDropdown();
                                }}
                            />
                            <button className="btn btn-outline-secondary" type="button" onClick={toggleDropdown}>▼</button>
                            <button className={`btn ${viewType === 'b2b' ? 'btn-primary' : 'btn-success'}`} onClick={() => setShowAddModal(true)}>+ New</button>
                        </div>

                        {/* LIVE DROPDOWN LIST */}
                        {isDropdownOpen && (
                            <div className="list-group position-absolute w-100 shadow mt-1 bg-white border" style={{zIndex: 1000, maxHeight: '300px', overflowY: 'auto'}}>
                                {filteredList.length === 0 ? (
                                    <div className="list-group-item text-muted small p-3 text-center">No matches found. Click "+ New" to add.</div>
                                ) : (
                                    filteredList.map(r => (
                                        <button
                                            key={r.id}
                                            className="list-group-item list-group-item-action p-2"
                                            onClick={() => handleSelectUser(r)}
                                        >
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <strong className="text-dark">
                                                        {viewType === 'b2b' ? r.retailer_detail?.retailer_shop_name : r.name}
                                                    </strong>
                                                    <br/>
                                                    <small className="text-muted">
                                                        {viewType === 'b2b' ? `${r.name} (${r.phone})` : r.phone}
                                                    </small>
                                                </div>
                                                <span className={`badge ${r.retailer_detail?.current_balance > 0 ? 'bg-danger' : 'bg-success'}`}>
                                                    ₹{r.retailer_detail?.current_balance}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* BALANCE & PAY */}
                    <div className="col-md-6 d-flex align-items-center justify-content-end gap-3">
                        {selectedRetailer && (
                            <>
                                <div className="text-end">
                                    <small className="text-muted d-block">CURRENT DEBT</small>
                                    <h3 className={`fw-bold mb-0 ${balance > 0 ? 'text-danger' : 'text-success'}`}>
                                        ₹{balance}
                                    </h3>
                                </div>
                                <button className="btn btn-success fw-bold px-4 py-2" onClick={() => setShowPayModal(true)}>
                                    + PAYMENT
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* TRANSACTIONS TABLE */}
            {selectedRetailer ? (
                loading ? <Loader /> : (
                    <div className="table-responsive shadow-sm border bg-white">
                        <table className="table table-hover mb-0">
                            <thead className="table-secondary">
                                <tr>
                                    <th>Date</th>
                                    <th>Description</th>
                                    <th className="text-danger text-end">Debit (Gave)</th>
                                    <th className="text-success text-end">Credit (Got)</th>
                                    <th className="text-end fw-bold">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center p-4 text-muted">No Transactions Found</td></tr>
                                ) : (
                                    transactions.map(txn => (
                                        <tr key={txn.id}>
                                            <td>{new Date(txn.date).toLocaleDateString()}</td>
                                            <td>
                                                {txn.description} <br/>
                                                <small className="text-muted">Ref: {txn.reference_id || '-'}</small>
                                            </td>
                                            <td className="text-end text-danger fw-bold">{txn.type === 'debit' ? `₹${txn.amount}` : '-'}</td>
                                            <td className="text-end text-success fw-bold">{txn.type === 'credit' ? `₹${txn.amount}` : '-'}</td>
                                            <td className="text-end">₹{txn.balance_after}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                <div className="text-center py-5 text-muted border border-dashed bg-light">
                    <h5>Search & Select a Customer to view history</h5>
                </div>
            )}

            {/* ADD PAYMENT MODAL */}
            <Modal show={showPayModal} onHide={() => setShowPayModal(false)} centered>
                <Modal.Header closeButton className="bg-success text-white"><Modal.Title>Receive Payment</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handlePayment}>
                        <Form.Group className="mb-3"><Form.Label>Amount (₹)</Form.Label><Form.Control type="number" required value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} /></Form.Group>
                        <Form.Group className="mb-3"><Form.Label>Note</Form.Label><Form.Control type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} /></Form.Group>
                        <Button variant="success" type="submit" className="w-100">Confirm Payment</Button>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* ADD CUSTOMER MODAL */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
                <Modal.Header closeButton className={viewType === 'b2b' ? 'bg-primary text-white' : 'bg-success text-white'}>
                    <Modal.Title>Add {viewType === 'b2b' ? 'B2B Client' : 'Walk-in'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleAddCustomer}>
                        <Form.Group className="mb-2"><Form.Label>Name</Form.Label><Form.Control required value={newCust.name} onChange={e => setNewCust({...newCust, name: e.target.value.toUpperCase()})} /></Form.Group>
                        <Form.Group className="mb-2"><Form.Label>Mobile</Form.Label><Form.Control required value={newCust.phone} onChange={e => setNewCust({...newCust, phone: e.target.value})} /></Form.Group>
                        {viewType === 'b2b' && (
                            <Form.Group className="mb-3"><Form.Label>Shop Name</Form.Label><Form.Control required value={newCust.shop} onChange={e => setNewCust({...newCust, shop: e.target.value.toUpperCase()})} /></Form.Group>
                        )}
                        <Button variant={viewType === 'b2b' ? 'primary' : 'success'} type="submit" className="w-100">Create Account</Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default LedgerManager;
