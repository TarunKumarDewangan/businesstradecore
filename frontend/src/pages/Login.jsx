import { useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify'; // Import Toast

const Login = () => {
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false); // To show spinner/disable button
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await api.post('/login', {
                login_id: loginId,
                password: password
            });

            if (response.data.status) {
                // 1. Save Token & User Info
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user_role', response.data.user.role);
                localStorage.setItem('user_name', response.data.user.name);
                localStorage.setItem('shop_id', response.data.user.shop_id);

                // 2. Redirect based on Role ID
                const role = response.data.user.role;

                if (role === 1) {
                    // Super Admin
                    navigate('/admin');
                    toast.success('Welcome Admin! 👑');
                } else if (role === 2 || role === 3) {
                    // Shop Owner (2) or Master (3)
                    navigate('/master');
                    toast.success('Login Successful! 🚀');
                } else if (role === 4) {
                    // Staff
                    navigate('/staff');
                    toast.info('Welcome to Staff Portal 🔧');
                } else if (role === 5) {
                    // Retailer (B2B)
                    navigate('/retailer');
                    toast.success('Welcome Partner! 🤝');
                } else {
                    toast.warning('Access denied for this role.');
                }
            }
        } catch (err) {
            // Handle Errors
            if (err.response && err.response.data) {
                toast.error(err.response.data.message);
            } else {
                toast.error('Server Error. Is the backend running?');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
            <div className="card shadow p-4" style={{ width: '400px', maxWidth: '90%' }}>
                <div className="text-center mb-4">
                    <h3 className="fw-bold text-primary">SubhAuto</h3>
                    <p className="text-muted">Spare Parts Management</p>
                </div>

                <form onSubmit={handleLogin}>
                    <div className="mb-3">
                        <label className="form-label">Email or Phone</label>
                        <input
                            type="text"
                            className="form-control"
                            value={loginId}
                            onChange={(e) => setLoginId(e.target.value)}
                            placeholder="Enter your ID"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
