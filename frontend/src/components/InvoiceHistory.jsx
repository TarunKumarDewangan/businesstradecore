import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Modal, Button, Badge } from 'react-bootstrap';
import Loader from './Loader';
import { toast } from 'react-toastify';

const InvoiceHistory = () => {
    const [invoices, setInvoices] = useState([]);
    const [shop, setShop] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch Logic
    const loadData = async (search = '') => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [invRes, shopRes] = await Promise.all([
                api.get(`/invoices?search=${search}`, { headers }),
                api.get('/settings/shop', { headers })
            ]);

            if (invRes.data.status) setInvoices(invRes.data.data.data);
            if (shopRes.data.status) setShop(shopRes.data.data);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        const timer = setTimeout(() => { loadData(searchTerm); }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Handle Delete
    const handleDelete = async (id) => {
        if(!window.confirm('⚠️ Are you sure? This will RESTORE Stock and REVERSE Ledger.')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await api.delete(`/invoices/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            if(res.data.status) {
                toast.success('Invoice Cancelled Successfully');
                loadData(searchTerm);
            }
        } catch(e) {
            toast.error('Failed to cancel invoice');
        }
    };

    // Print Logic
    const handleView = (invoice) => {
        setSelectedInvoice(invoice);
        setShowModal(true);
    };

    const handlePrint = () => {
        const printContent = document.getElementById('printable-area').innerHTML;
        const originalContent = document.body.innerHTML;
        document.body.innerHTML = printContent;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload();
    };

    return (
        <div className="mt-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4>Sales History</h4>
                <input
                    type="text"
                    className="form-control w-25 shadow-sm"
                    placeholder="🔍 Search Invoice / Name / Phone..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? <Loader /> : (
                <div className="table-responsive shadow-sm border bg-white rounded">
                    <table className="table table-striped table-hover mb-0 align-middle">
                        <thead className="table-dark">
                            <tr>
                                <th>Inv No</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Type</th>
                                <th>Total</th>
                                <th>Mode</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.length === 0 ? (
                                <tr><td colSpan="8" className="text-center p-5">No Invoices Found</td></tr>
                            ) : invoices.map(inv => {
                                // 1. Get Phone
                                const phone = inv.customer?.phone || inv.customer_phone || 'N/A';

                                // 2. Determine Type (Strict Logic)
                                let typeLabel = 'Walk-in';
                                let typeBadge = 'secondary'; // Grey for Walk-in

                                if (inv.customer) {
                                    // Check the flag from DB
                                    const dbType = inv.customer.retailer_detail?.customer_type;
                                    if (dbType === 'b2b') {
                                        typeLabel = 'Retailer';
                                        typeBadge = 'primary'; // Blue for Retailer
                                    }
                                }

                                return (
                                    <tr key={inv.id}>
                                        <td className="fw-bold">{inv.invoice_number}</td>
                                        <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                                        <td>
                                            {inv.customer ? inv.customer.name : inv.customer_name}
                                            <br/><small className="text-muted">{phone}</small>
                                        </td>
                                        <td>
                                            <Badge bg={typeBadge}>{typeLabel}</Badge>
                                        </td>
                                        <td className="fw-bold">₹{inv.grand_total}</td>
                                        <td><Badge bg="success">{inv.payment_mode.toUpperCase()}</Badge></td>
                                        <td className="text-center">
                                            <div className="btn-group">
                                                <button className="btn btn-sm btn-outline-primary" onClick={() => handleView(inv)}>
                                                    🖨 Print
                                                </button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(inv.id)}>
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* PRINT MODAL */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Invoice Preview</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedInvoice && (
                        <div id="printable-area" className="p-4 border bg-white">
                            <div className="text-center mb-4">
                                {shop.shop_logo && <img src={`http://127.0.0.1:8000/storage/${shop.shop_logo}`} height="60" alt="Logo" className="mb-2"/>}
                                <h2 className="fw-bold m-0">{shop.shop_name?.toUpperCase()}</h2>
                                <p className="mb-0">GST: {shop.gst_number || 'N/A'}</p>
                                <hr/>
                            </div>

                            <div className="d-flex justify-content-between mb-3">
                                <div>
                                    <strong>Bill To:</strong><br/>
                                    {selectedInvoice.customer ? selectedInvoice.customer.name : selectedInvoice.customer_name}<br/>
                                    Phone: {selectedInvoice.customer?.phone || selectedInvoice.customer_phone || 'N/A'}
                                </div>
                                <div className="text-end">
                                    <strong>Invoice #:</strong> {selectedInvoice.invoice_number}<br/>
                                    <strong>Date:</strong> {new Date(selectedInvoice.created_at).toLocaleDateString()}
                                </div>
                            </div>

                            <table className="table table-bordered">
                                <thead className="table-light">
                                    <tr><th>Item</th><th className="text-center">Qty</th><th className="text-end">Rate</th><th className="text-end">Total</th></tr>
                                </thead>
                                <tbody>
                                    {selectedInvoice.items && selectedInvoice.items.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.item_name}</td>
                                            <td className="text-center">{item.quantity}</td>
                                            <td className="text-end">₹{item.unit_price}</td>
                                            <td className="text-end">₹{item.total_price}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="d-flex justify-content-end">
                                <div className="w-50">
                                    <div className="d-flex justify-content-between"><span>Sub Total:</span><span>₹{selectedInvoice.total_amount}</span></div>
                                    <div className="d-flex justify-content-between"><span>Discount:</span><span>- ₹{selectedInvoice.discount}</span></div>
                                    <div className="d-flex justify-content-between fw-bold fs-5 border-top pt-1 mt-1"><span>Grand Total:</span><span>₹{selectedInvoice.grand_total}</span></div>
                                </div>
                            </div>
                            <hr/>
                            <p className="text-center text-muted small">Thank you for your business!</p>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                    <Button variant="success" onClick={handlePrint}>Print Bill</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default InvoiceHistory;
