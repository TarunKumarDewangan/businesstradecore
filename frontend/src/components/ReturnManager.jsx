import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import Loader from './Loader';
import { Badge } from 'react-bootstrap';

const ReturnManager = () => {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('requests');

    const fetchReturns = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/returns', { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) setReturns(res.data.data.data);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchReturns(); }, []);

    const handleProcess = async (id, action) => {
        if(!window.confirm('Are you sure?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await api.post(`/return/${id}/process`, { action }, { headers: { Authorization: `Bearer ${token}` } });
            if(res.data.status) { toast.success(res.data.message); fetchReturns(); }
        } catch(e) { toast.error('Failed'); }
    };

    const handleInspect = async (id, action) => {
        if(!window.confirm(`Confirm ${action}?`)) return;
        try {
            const token = localStorage.getItem('token');
            const res = await api.post(`/return/${id}/inspect`, { action }, { headers: { Authorization: `Bearer ${token}` } });
            if(res.data.status) { toast.success(res.data.message); fetchReturns(); }
        } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
    };

    // --- FILTERS ---
    const requestList = returns.filter(r => r.status === 'pending');

    // Shows Approved returns that have NO inspection result yet (Pending or NULL)
    const inspectionList = returns.filter(r =>
        r.status === 'approved' && (!r.inspection_status || r.inspection_status === 'pending')
    );

    // Shows Completed or Rejected
    const historyList = returns.filter(r =>
        r.status === 'rejected' || (r.inspection_status === 'restocked' || r.inspection_status === 'scrapped')
    );

    const renderTable = (list, type) => (
        <div className="table-responsive bg-white shadow-sm border">
            <table className="table table-hover mb-0 align-middle">
                <thead className="table-light"><tr><th>Retailer</th><th>Item</th><th>Qty</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                    {list.length === 0 ? <tr><td colSpan="5" className="text-center p-4">No Items</td></tr> : list.map(req => (
                        <tr key={req.id}>
                            <td>{req.retailer?.name}</td>
                            <td>{req.item?.item_name}</td>
                            <td className="fw-bold">{req.quantity}</td>
                            <td><Badge bg={req.status === 'rejected' ? 'danger' : (req.inspection_status === 'scrapped' ? 'secondary' : 'success')}>{req.inspection_status?.toUpperCase() || req.status.toUpperCase()}</Badge></td>
                            <td>
                                {type === 'requests' && <><button className="btn btn-sm btn-success me-1" onClick={() => handleProcess(req.id, 'approve')}>✓ Credit</button><button className="btn btn-sm btn-danger" onClick={() => handleProcess(req.id, 'reject')}>✗ Reject</button></>}
                                {type === 'inspections' && <><button className="btn btn-sm btn-outline-success me-1" onClick={() => handleInspect(req.id, 'restock')}>📦 Restock</button><button className="btn btn-sm btn-outline-secondary" onClick={() => handleInspect(req.id, 'scrap')}>🗑️ Scrap</button></>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="mt-3">
            <div className="d-flex mb-4 gap-2">
                <button className={`btn ${view === 'requests' ? 'btn-warning' : 'btn-outline-warning'}`} onClick={() => setView('requests')}>Requests ({requestList.length})</button>
                <button className={`btn ${view === 'inspections' ? 'btn-info text-white' : 'btn-outline-info'}`} onClick={() => setView('inspections')}>Inspection ({inspectionList.length})</button>
                <button className={`btn ${view === 'history' ? 'btn-secondary' : 'btn-outline-secondary'}`} onClick={() => setView('history')}>History</button>
            </div>
            {loading ? <Loader /> : renderTable(view === 'requests' ? requestList : view === 'inspections' ? inspectionList : historyList, view)}
        </div>
    );
};
export default ReturnManager;
