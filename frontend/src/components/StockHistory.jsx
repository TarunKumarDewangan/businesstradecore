import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import Loader from './Loader';
import { Badge } from 'react-bootstrap';

const StockHistory = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState(''); // '' or 'in' or 'out'

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/stock-history?search=${searchTerm}&type=${filterType}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) setLogs(res.data.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => { fetchLogs(); }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, filterType]);

    return (
        <div className="mt-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4>📉 STOCK HISTORY (AUDIT TRAIL)</h4>
            </div>

            {/* FILTERS */}
            <div className="row g-2 mb-3">
                <div className="col-md-8">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="🔍 Search Item Name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="col-md-4">
                    <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="">All Transactions</option>
                        <option value="in">🟢 Stock IN (Added)</option>
                        <option value="out">🔴 Stock OUT (Sold/Used)</option>
                    </select>
                </div>
            </div>

            {/* TABLE */}
            {loading ? <Loader /> : (
                <div className="table-responsive shadow-sm border bg-white rounded">
                    <table className="table table-hover mb-0">
                        <thead className="table-light">
                            <tr>
                                <th>Date</th>
                                <th>Item</th>
                                <th>Action</th>
                                <th>Qty</th>
                                <th>Balance</th>
                                <th>Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr><td colSpan="6" className="text-center p-5 text-muted">No History Found</td></tr>
                            ) : logs.map(log => (
                                <tr key={log.id}>
                                    <td className="text-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                                    <td className="fw-bold">{log.item?.item_name || 'Deleted Item'}</td>
                                    <td>
                                        <Badge bg={log.type === 'in' ? 'success' : 'danger'}>
                                            {log.type.toUpperCase()}
                                        </Badge>
                                    </td>
                                    <td className={log.type === 'in' ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                                        {log.type === 'in' ? '+' : '-'}{log.quantity}
                                    </td>
                                    <td>{log.balance_after}</td>
                                    <td className="small text-muted">{log.reason}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default StockHistory;
