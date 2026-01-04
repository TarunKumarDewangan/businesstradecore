import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import Loader from './Loader';

const ReturnManager = () => {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReturns = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/returns', { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) setReturns(res.data.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReturns(); }, []);

    const handleProcess = async (id, action) => {
        if(!window.confirm(`Are you sure you want to ${action}?`)) return;

        try {
            const token = localStorage.getItem('token');
            // If approving, we assume restocking for now (or could add checkbox in UI)
            const res = await api.post(`/return/${id}/process`, {
                action,
                restock: true // Add back to stock?
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.status) {
                toast.success(res.data.message);
                fetchReturns();
            }
        } catch (error) {
            toast.error('Action Failed');
        }
    };

    return (
        <div className="mt-3">
            <h4>↩️ Return Requests</h4>

            {loading ? <Loader /> : (
                <div className="table-responsive bg-white shadow-sm border">
                    <table className="table table-hover mb-0">
                        <thead className="table-light">
                            <tr>
                                <th>Retailer</th>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Reason</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {returns.length === 0 ? (
                                <tr><td colSpan="6" className="text-center p-4">No Returns</td></tr>
                            ) : returns.map(req => (
                                <tr key={req.id}>
                                    <td>{req.retailer?.name}</td>
                                    <td>{req.item?.item_name}</td>
                                    <td className="fw-bold">{req.quantity}</td>
                                    <td className="text-muted small">{req.reason}</td>
                                    <td>
                                        <span className={`badge ${req.status === 'pending' ? 'bg-warning text-dark' : req.status === 'approved' ? 'bg-success' : 'bg-danger'}`}>
                                            {req.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>
                                        {req.status === 'pending' && (
                                            <div className="btn-group">
                                                <button className="btn btn-sm btn-success" onClick={() => handleProcess(req.id, 'approve')}>Approve</button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleProcess(req.id, 'reject')}>Reject</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ReturnManager;
