import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Modal, Button } from 'react-bootstrap';
import Loader from './Loader';

const InvoiceHistory = () => {
    const [invoices, setInvoices] = useState([]);
    const [shop, setShop] = useState({}); // Store Shop Details
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        // 1. Fetch Invoices & Shop Details together
        const loadData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };

                const [invRes, shopRes] = await Promise.all([
                    api.get('/invoices', { headers }),
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
        loadData();
    }, []);

    // 2. Open Print Modal
    const handleView = (invoice) => {
        setSelectedInvoice(invoice);
        setShowModal(true);
    };

    // 3. Print Function
    const handlePrint = () => {
        const printContent = document.getElementById('printable-area').innerHTML;
        const originalContent = document.body.innerHTML;

        document.body.innerHTML = printContent;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload(); // Reload to restore event listeners
    };

    return (
        <div className="mt-3">
            <h4>Sales History</h4>

            {loading ? <Loader /> : (
                <div className="table-responsive">
                    <table className="table table-striped table-hover">
                        <thead className="table-dark">
                            <tr>
                                <th>Inv No</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Total</th>
                                <th>Paid</th>
                                <th>Mode</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.length === 0 ? (
                                <tr><td colSpan="7" className="text-center">No Invoices Found</td></tr>
                            ) : invoices.map(inv => (
                                <tr key={inv.id}>
                                    <td>{inv.invoice_number}</td>
                                    <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                                    <td>
                                        {inv.customer ? inv.customer.name : inv.customer_name}
                                        <br/><small className="text-muted">{inv.customer_phone}</small>
                                    </td>
                                    <td className="fw-bold">₹{inv.grand_total}</td>
                                    <td className="text-success">₹{inv.paid_amount}</td>
                                    <td><span className="badge bg-secondary">{inv.payment_mode.toUpperCase()}</span></td>
                                    <td>
                                        <button className="btn btn-sm btn-primary" onClick={() => handleView(inv)}>
                                            🖨 Print
                                        </button>
                                    </td>
                                </tr>
                            ))}
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
                        <div id="printable-area" className="p-3 border bg-white">

                            {/* DYNAMIC HEADER */}
                            <div className="text-center mb-4">
                                {shop.shop_logo && (
                                    <img
                                        src={`http://127.0.0.1:8000/storage/${shop.shop_logo}`}
                                        height="60"
                                        alt="Logo"
                                        className="mb-2"
                                    />
                                )}
                                <h2 className="fw-bold m-0">{shop.shop_name?.toUpperCase() || 'MY SHOP'}</h2>
                                <p className="mb-0">GST: {shop.gst_number || 'N/A'}</p>
                                <hr/>
                            </div>

                            {/* INFO */}
                            <div className="d-flex justify-content-between mb-3">
                                <div>
                                    <strong>Bill To:</strong><br/>
                                    {selectedInvoice.customer ? selectedInvoice.customer.name : selectedInvoice.customer_name}<br/>
                                    Phone: {selectedInvoice.customer_phone || 'N/A'}
                                </div>
                                <div className="text-end">
                                    <strong>Invoice #:</strong> {selectedInvoice.invoice_number}<br/>
                                    <strong>Date:</strong> {new Date(selectedInvoice.created_at).toLocaleDateString()}
                                </div>
                            </div>

                            {/* ITEMS TABLE */}
                            <table className="table table-bordered">
                                <thead className="table-light">
                                    <tr>
                                        <th>Item</th>
                                        <th className="text-center">Qty</th>
                                        <th className="text-end">Rate</th>
                                        <th className="text-end">Total</th>
                                    </tr>
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

                            {/* TOTALS */}
                            <div className="d-flex justify-content-end">
                                <div className="w-50">
                                    <div className="d-flex justify-content-between">
                                        <span>Sub Total:</span>
                                        <span>₹{selectedInvoice.total_amount}</span>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <span>Discount:</span>
                                        <span>- ₹{selectedInvoice.discount}</span>
                                    </div>
                                    <div className="d-flex justify-content-between fw-bold fs-5 border-top pt-1 mt-1">
                                        <span>Grand Total:</span>
                                        <span>₹{selectedInvoice.grand_total}</span>
                                    </div>
                                    <div className="d-flex justify-content-between text-success mt-2">
                                        <span>Paid:</span>
                                        <span>₹{selectedInvoice.paid_amount}</span>
                                    </div>
                                    <div className="d-flex justify-content-between text-danger">
                                        <span>Balance Due:</span>
                                        <span>₹{selectedInvoice.grand_total - selectedInvoice.paid_amount}</span>
                                    </div>
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
