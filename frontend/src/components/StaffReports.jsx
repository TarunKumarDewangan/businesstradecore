import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import Loader from './Loader';

const StaffReports = () => {
    const [view, setView] = useState('attendance'); // 'attendance' or 'logs'
    const [attendanceList, setAttendanceList] = useState([]);
    const [workLogs, setWorkLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch Data based on selected view
    const loadData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            if (view === 'attendance') {
                const res = await api.get('/staff/attendance-list', { headers });
                if (res.data.status) setAttendanceList(res.data.data);
            } else {
                const res = await api.get('/staff/worklog-list', { headers });
                if (res.data.status) setWorkLogs(res.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [view]);

    // ==========================================
    // 🛠️ HELPER FUNCTIONS FOR FORMATTING
    // ==========================================

    // Format Date: 2025-12-30 -> 30-12-2025
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        // 'en-GB' gives dd/mm/yyyy. We replace / with -
        return date.toLocaleDateString('en-GB').replace(/\//g, '-');
    };

    // Format Time: 18:30:00 -> 06:30 PM
    const formatTime = (timeString) => {
        if (!timeString) return '-';
        // Check if timeString includes seconds (HH:MM:SS) or just HH:MM
        const [hours, minutes] = timeString.split(':');

        let h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';

        h = h % 12;
        h = h ? h : 12; // the hour '0' should be '12'

        // Return formatted string like 06:30 PM
        return `${h}:${minutes} ${ampm}`;
    };

    return (
        <div className="container-fluid mt-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4>STAFF ACTIVITY REPORTS</h4>

                {/* Toggle Buttons */}
                <div className="btn-group">
                    <button
                        className={`btn ${view === 'attendance' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setView('attendance')}
                    >
                        🕒 Attendance
                    </button>
                    <button
                        className={`btn ${view === 'logs' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setView('logs')}
                    >
                        📝 Work Logs
                    </button>
                </div>
            </div>

            {loading ? <Loader /> : (
                <>
                    {/* VIEW 1: ATTENDANCE TABLE */}
                    {view === 'attendance' && (
                        <div className="table-responsive shadow-sm border bg-white">
                            <table className="table table-hover mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Date</th>
                                        <th>Staff Name</th>
                                        <th>Check In</th>
                                        <th>Check Out</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendanceList.length === 0 ? (
                                        <tr><td colSpan="5" className="text-center p-4">No Attendance Records</td></tr>
                                    ) : (
                                        attendanceList.map(item => (
                                            <tr key={item.id}>
                                                {/* Use Helper Function for Date */}
                                                <td>{formatDate(item.date)}</td>

                                                <td className="fw-bold">{item.staff_name}</td>

                                                {/* Use Helper Function for Time */}
                                                <td className="text-success fw-bold">{formatTime(item.check_in)}</td>
                                                <td className="text-danger fw-bold">{formatTime(item.check_out)}</td>

                                                <td>
                                                    <span className={`badge ${item.check_out ? 'bg-success' : 'bg-warning text-dark'}`}>
                                                        {item.check_out ? 'Completed' : 'Working'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* VIEW 2: WORK LOGS */}
                    {view === 'logs' && (
                        <div className="row g-3">
                            {workLogs.length === 0 ? (
                                <div className="col-12 text-center p-5 bg-white border">No Work Logs Submitted</div>
                            ) : (
                                workLogs.map(log => (
                                    <div className="col-md-6" key={log.id}>
                                        <div className="card h-100 shadow-sm">
                                            <div className="card-header bg-white d-flex justify-content-between">
                                                <strong>{log.user?.name}</strong>
                                                <small className="text-muted">{formatDate(log.date)}</small>
                                            </div>
                                            <div className="card-body">
                                                <h6 className="card-title text-primary">{log.title}</h6>
                                                <p className="card-text text-secondary">{log.description || 'No details provided.'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default StaffReports;
