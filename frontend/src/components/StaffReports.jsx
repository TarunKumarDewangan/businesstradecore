import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import Loader from './Loader';
import { toast } from 'react-toastify';

const StaffReports = () => {
    const [view, setView] = useState('attendance'); // 'attendance', 'logs', 'manual'
    const [attendanceList, setAttendanceList] = useState([]);
    const [workLogs, setWorkLogs] = useState([]);
    const [staffList, setStaffList] = useState([]); // List for dropdown
    const [loading, setLoading] = useState(false);

    // Manual Entry States
    const [selectedStaff, setSelectedStaff] = useState('');
    const [currentStatus, setCurrentStatus] = useState(null); // To show if they are currently IN or OUT
    const [logForm, setLogForm] = useState({ title: '', description: '' });

    // Load Data based on View
    const loadData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            if (view === 'attendance') {
                const res = await api.get('/staff/attendance-list', { headers });
                if (res.data.status) setAttendanceList(res.data.data);
            } else if (view === 'logs') {
                const res = await api.get('/staff/worklog-list', { headers });
                if (res.data.status) setWorkLogs(res.data.data);
            } else if (view === 'manual') {
                // Load Staff List for Dropdown
                const res = await api.get('/shop-users?type=staff', { headers });
                if (res.data.status) setStaffList(res.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [view]);

    // Check Status when Staff is Selected in Manual Tab
    useEffect(() => {
        if (view === 'manual' && selectedStaff) {
            const checkStatus = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await api.get(`/staff-status/${selectedStaff}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.data.status) setCurrentStatus(res.data.data);
                } catch(e) { console.error(e); }
            };
            checkStatus();
        } else {
            setCurrentStatus(null);
        }
    }, [selectedStaff, view]);

    // Manual Punch Action
    const handleManualPunch = async () => {
        if(!selectedStaff) return toast.warning('Select Staff first');
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/manual/punch', { user_id: selectedStaff }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if(res.data.status) {
                toast.success(res.data.message);
                // Refresh Status
                const statusRes = await api.get(`/staff-status/${selectedStaff}`, { headers: { Authorization: `Bearer ${token}` } });
                setCurrentStatus(statusRes.data.data);
            }
        } catch(e) { toast.error('Action Failed'); }
    };

    // Manual Work Log Action
    const handleManualLog = async (e) => {
        e.preventDefault();
        if(!selectedStaff) return toast.warning('Select Staff first');
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/manual/worklog', {
                user_id: selectedStaff,
                title: logForm.title,
                description: logForm.description
            }, { headers: { Authorization: `Bearer ${token}` } });

            if(res.data.status) {
                toast.success('Log Added!');
                setLogForm({ title: '', description: '' });
            }
        } catch(e) { toast.error('Failed'); }
    };

    // Formatting Helpers
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB').replace(/\//g, '-') : '-';
    const formatTime = (t) => {
        if (!t) return '-';
        const [h, m] = t.split(':');
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return `${hour}:${m} ${ampm}`;
    };

    return (
        <div className="container-fluid mt-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4>STAFF ACTIVITY</h4>

                <div className="btn-group">
                    <button className={`btn ${view === 'attendance' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setView('attendance')}>🕒 Attendance</button>
                    <button className={`btn ${view === 'logs' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setView('logs')}>📝 Work Logs</button>
                    <button className={`btn ${view === 'manual' ? 'btn-warning text-dark' : 'btn-outline-warning text-dark'}`} onClick={() => setView('manual')}>🛠️ Manual Entry</button>
                </div>
            </div>

            {loading ? <Loader /> : (
                <>
                    {/* VIEW 1: ATTENDANCE */}
                    {view === 'attendance' && (
                        <div className="table-responsive shadow-sm border bg-white">
                            <table className="table table-hover mb-0">
                                <thead className="table-light">
                                    <tr><th>Date</th><th>Name</th><th>In</th><th>Out</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                    {attendanceList.map(item => (
                                        <tr key={item.id}>
                                            <td>{formatDate(item.date)}</td>
                                            <td className="fw-bold">{item.staff_name}</td>
                                            <td className="text-success">{formatTime(item.check_in)}</td>
                                            <td className="text-danger">{formatTime(item.check_out)}</td>
                                            <td><span className={`badge ${item.check_out ? 'bg-success' : 'bg-warning text-dark'}`}>{item.check_out ? 'Completed' : 'Working'}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* VIEW 2: LOGS */}
                    {view === 'logs' && (
                        <div className="row g-3">
                            {workLogs.map(log => (
                                <div className="col-md-6" key={log.id}>
                                    <div className="card h-100 shadow-sm">
                                        <div className="card-header bg-white d-flex justify-content-between">
                                            <strong>{log.user?.name}</strong>
                                            <small className="text-muted">{formatDate(log.date)}</small>
                                        </div>
                                        <div className="card-body">
                                            <h6 className="card-title text-primary">{log.title}</h6>
                                            <p className="card-text text-secondary">{log.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* VIEW 3: MANUAL ENTRY (New Feature) */}
                    {view === 'manual' && (
                        <div className="row justify-content-center">
                            <div className="col-md-6">
                                <div className="card shadow border-0">
                                    <div className="card-header bg-warning text-dark fw-bold">Manual Staff Entry</div>
                                    <div className="card-body">
                                        <div className="mb-4">
                                            <label className="form-label">Select Staff Member</label>
                                            <select className="form-select" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
                                                <option value="">-- Select Staff --</option>
                                                {staffList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>)}
                                            </select>
                                        </div>

                                        {selectedStaff && (
                                            <>
                                                <div className="mb-4 p-3 bg-light rounded border text-center">
                                                    <h6 className="text-muted">Current Status</h6>
                                                    {!currentStatus || currentStatus.check_out ? (
                                                        <button className="btn btn-success w-100 mt-2" onClick={handleManualPunch}>
                                                            ☀️ PUNCH IN (Start Shift)
                                                        </button>
                                                    ) : (
                                                        <button className="btn btn-danger w-100 mt-2" onClick={handleManualPunch}>
                                                            🌙 PUNCH OUT (End Shift)
                                                        </button>
                                                    )}
                                                    {currentStatus && !currentStatus.check_out && (
                                                        <small className="d-block mt-2 text-success">Currently In since {formatTime(currentStatus.check_in)}</small>
                                                    )}
                                                </div>

                                                <hr />
                                                <h6 className="mb-3">Add Work Log (On behalf of staff)</h6>
                                                <form onSubmit={handleManualLog}>
                                                    <input className="form-control mb-2" placeholder="Work Title" required
                                                        value={logForm.title} onChange={e => setLogForm({...logForm, title: e.target.value})} />
                                                    <textarea className="form-control mb-2" placeholder="Description" rows="2"
                                                        value={logForm.description} onChange={e => setLogForm({...logForm, description: e.target.value})}></textarea>
                                                    <button className="btn btn-outline-primary w-100">Submit Log</button>
                                                </form>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default StaffReports;
