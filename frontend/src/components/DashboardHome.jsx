import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import Loader from './Loader';
import { useNavigate } from 'react-router-dom';

const DashboardHome = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await api.get('/dashboard/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.status) setStats(res.data.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <Loader />;

    return (
        <div className="container-fluid">
            <h4 className="mb-4">👋 Welcome Back!</h4>

            {/* 1. ACTION ALERTS (Only show if there are pending items) */}
            <div className="row g-3 mb-4">
                {stats?.pending_orders > 0 && (
                    <div className="col-md-6">
                        <div className="alert alert-warning border-warning shadow-sm d-flex justify-content-between align-items-center" role="alert">
                            <div>
                                <h5 className="alert-heading fw-bold">🔔 {stats.pending_orders} New Orders</h5>
                                <p className="mb-0">Retailers are waiting for dispatch.</p>
                            </div>
                            <button className="btn btn-dark btn-sm" onClick={() => navigate('/master/orders')}>
                                View Orders →
                            </button>
                        </div>
                    </div>
                )}

                {stats?.pending_returns > 0 && (
                    <div className="col-md-6">
                        <div className="alert alert-danger border-danger shadow-sm d-flex justify-content-between align-items-center" role="alert">
                            <div>
                                <h5 className="alert-heading fw-bold">↩️ {stats.pending_returns} Returns Pending</h5>
                                <p className="mb-0">Items reported as damaged/wrong.</p>
                            </div>
                            <button className="btn btn-dark btn-sm" onClick={() => navigate('/master/returns')}>
                                Review Now →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. STATS CARDS */}
            <div className="row g-3 mb-4">
                {/* Card 1: Today's Net Sale */}
                <div className="col-md-3"> {/* Changed width slightly if needed, or stick to col-md */}
                    <div className="card text-white bg-success shadow-sm h-100">
                        <div className="card-body">
                            <h6 className="card-title opacity-75">Today's Net Sale</h6>
                            <h3 className="fw-bold">₹{stats?.today_sale}</h3>
                            <small className="opacity-50" style={{fontSize: '0.7rem'}}>(After Returns)</small>
                        </div>
                    </div>
                </div>

                {/* Card 2: Monthly Net Sale */}
                <div className="col-md-3">
                    <div className="card text-white bg-primary shadow-sm h-100">
                        <div className="card-body">
                            <h6 className="card-title opacity-75">Month Net Sale</h6>
                            <h3 className="fw-bold">₹{stats?.month_sale}</h3>
                        </div>
                    </div>
                </div>

                {/* Card 3: Returns (NEW) */}
                <div className="col-md-2">
                    <div className="card text-white bg-danger shadow-sm h-100">
                        <div className="card-body">
                            <h6 className="card-title opacity-75">Returns (Mo)</h6>
                            <h3 className="fw-bold">₹{stats?.month_returns}</h3>
                        </div>
                    </div>
                </div>

                {/* Card 4: Credit */}
                <div className="col-md-2">
                    <div className="card text-white bg-warning shadow-sm h-100">
                        <div className="card-body text-dark">
                            <h6 className="card-title opacity-75">Market Credit</h6>
                            <h3 className="fw-bold">₹{stats?.total_credit}</h3>
                        </div>
                    </div>
                </div>

                {/* Card 5: Low Stock */}
                <div className="col-md-2">
                    <div className="card text-white bg-secondary shadow-sm h-100">
                        <div className="card-body">
                            <h6 className="card-title opacity-75">Low Stock</h6>
                            <h3 className="fw-bold">{stats?.low_stock}</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-3">
                {/* 3. RECENT SALES TABLE */}
                <div className="col-md-8">
                    <div className="card shadow-sm">
                        <div className="card-header bg-white fw-bold">Recent Invoices</div>
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Inv #</th>
                                        <th>Customer</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats?.recent_invoices.length === 0 ? (
                                        <tr><td colSpan="4" className="text-center p-3">No Sales Yet</td></tr>
                                    ) : (
                                        stats?.recent_invoices.map(inv => (
                                            <tr key={inv.id}>
                                                <td>{inv.invoice_number}</td>
                                                <td>{inv.customer ? inv.customer.name : inv.customer_name}</td>
                                                <td className="fw-bold">₹{inv.grand_total}</td>
                                                <td>
                                                    <span className={`badge ${inv.payment_mode === 'credit' ? 'bg-warning text-dark' : 'bg-success'}`}>
                                                        {inv.payment_mode.toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* 4. STAFF STATUS */}
                <div className="col-md-4">
                    <div className="card shadow-sm h-100">
                        <div className="card-header bg-white fw-bold">Store Status</div>
                        <div className="card-body text-center d-flex flex-column justify-content-center">
                            <h1 className="display-4 fw-bold text-primary">{stats?.staff_present}</h1>
                            <p className="text-muted">Staff Present Today</p>
                            <hr/>
                            <button className="btn btn-outline-primary btn-sm w-100" onClick={() => navigate('/master/reports')}>
                                View Attendance
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;
