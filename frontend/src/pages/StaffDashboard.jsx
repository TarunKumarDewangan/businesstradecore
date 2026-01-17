import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import Loader from '../components/Loader';

const StaffDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

    // Work Log State
    const [workTitle, setWorkTitle] = useState('');
    const [workDesc, setWorkDesc] = useState('');

    // 1. Clock Timer
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. Fetch Status
    const fetchStatus = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/staff/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status) setAttendance(res.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStatus(); }, []);

    // 3. Handle Punch In/Out (With GPS)
    const handlePunch = () => {
        if (!navigator.geolocation) {
            return toast.error("Geolocation is not supported by this browser.");
        }

        toast.info("Getting Location...");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                try {
                    const token = localStorage.getItem('token');
                    // Send Lat/Lng to Backend
                    const res = await api.post('/staff/punch', { lat, lng }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (res.data.status) {
                        toast.success(res.data.message);
                        fetchStatus(); // Refresh UI
                    }
                } catch (error) {
                    // Show Backend Error (e.g., "You are too far!")
                    toast.error(error.response?.data?.message || 'Action failed');
                }
            },
            (error) => {
                toast.error("Please Allow Location Access to Punch In.");
            },
            { enableHighAccuracy: true } // Request precise GPS
        );
    };

    // 4. Submit Work Log
    const handleSubmitLog = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/staff/worklog', {
                title: workTitle,
                description: workDesc
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.status) {
                toast.success('Work Report Submitted! ✅');
                setWorkTitle('');
                setWorkDesc('');
            }
        } catch (error) {
            toast.error('Failed to submit report');
        }
    };

    return (
        <div className="container" style={{ maxWidth: '600px' }}>

            {/* 1. ATTENDANCE CARD */}
            <div className="card shadow-sm mb-4 text-center border-0">
                <div className="card-body py-4">
                    <h5 className="text-muted">Current Time</h5>
                    <h2 className="display-4 fw-bold text-dark">{currentTime}</h2>

                    {loading ? <Loader /> : (
                        <div className="mt-4">
                            {!attendance || attendance.check_out ? (
                                <div>
                                    {attendance && attendance.check_out && (
                                        <div className="alert alert-secondary d-inline-block px-4 py-1 rounded-pill mb-3">
                                            Last Session: {attendance.check_in} - {attendance.check_out}
                                        </div>
                                    )}
                                    <br/>
                                    <button
                                        className="btn btn-success btn-lg rounded-pill px-5 py-3 shadow"
                                        onClick={handlePunch}
                                    >
                                        {attendance ? '🔄 RE-CHECK IN' : '☀️ PUNCH IN'}
                                    </button>
                                    <p className="mt-2 text-muted small">
                                        {attendance ? 'Start a new shift' : 'Start your day'}
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <div className="alert alert-success d-inline-block px-4 py-1 rounded-pill mb-3">
                                        Currently Working (In: {attendance.check_in})
                                    </div>
                                    <br/>
                                    <button
                                        className="btn btn-danger btn-lg rounded-pill px-5 py-3 shadow"
                                        onClick={handlePunch}
                                    >
                                        🌙 PUNCH OUT
                                    </button>
                                    <p className="mt-2 text-muted small">End current shift</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 2. WORK REPORT CARD */}
            <div className="card shadow-sm border-0">
                <div className="card-header bg-white fw-bold">
                    📝 Submit Daily Work Report
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmitLog}>
                        <div className="mb-3">
                            <label className="form-label small text-muted">Work Title</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Repaired Hero Splendor Engine"
                                required
                                value={workTitle}
                                onChange={e => setWorkTitle(e.target.value)}
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label small text-muted">Details (Optional)</label>
                            <textarea
                                className="form-control"
                                rows="3"
                                placeholder="Describe what you did..."
                                value={workDesc}
                                onChange={e => setWorkDesc(e.target.value)}
                            ></textarea>
                        </div>
                        <button type="submit" className="btn btn-primary w-100">
                            Submit Report
                        </button>
                    </form>
                </div>
            </div>

        </div>
    );
};

export default StaffDashboard;
