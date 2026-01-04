import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';

const SettingsManager = () => {
    // Shop State
    const [shop, setShop] = useState({ shop_name: '', gst_number: '' });
    const [logo, setLogo] = useState(null);
    const [preview, setPreview] = useState(null);

    // Password State
    const [pass, setPass] = useState({ current: '', new: '', confirm: '' });

    // Fetch Shop Data
    useEffect(() => {
        const fetchShop = async () => {
            const token = localStorage.getItem('token');
            const res = await api.get('/settings/shop', { headers: { Authorization: `Bearer ${token}` } });
            if(res.data.status) {
                setShop(res.data.data);
                if(res.data.data.shop_logo) {
                    setPreview('http://127.0.0.1:8000/storage/' + res.data.data.shop_logo);
                }
            }
        };
        fetchShop();
    }, []);

    // Handle Shop Update
    const handleShopUpdate = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('shop_name', shop.shop_name);
        formData.append('gst_number', shop.gst_number || '');
        formData.append('address', '123 Main St');
        if(logo) formData.append('logo', logo);

        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/settings/shop', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if(res.data.status) toast.success('Shop Details Updated! 🏪');
        } catch (err) {
            toast.error('Update Failed');
        }
    };

    // Handle Password Change
    const handlePassChange = async (e) => {
        e.preventDefault();
        if(pass.new !== pass.confirm) return toast.error('Passwords do not match');

        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/settings/password', {
                current_password: pass.current,
                new_password: pass.new,
                new_password_confirmation: pass.confirm
            }, { headers: { Authorization: `Bearer ${token}` } });

            if(res.data.status) {
                toast.success('Password Changed! Please Login again.');
                setPass({ current: '', new: '', confirm: '' });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error');
        }
    };

    return (
        <div className="container-fluid">
            <h4 className="mb-4">⚙️ Settings</h4>

            <div className="row g-4">
                {/* SHOP SETTINGS */}
                <div className="col-12 col-md-6">
                    <div className="card shadow-sm h-100 border-0">
                        <div className="card-header bg-primary text-white fw-bold">Shop Profile</div>
                        <div className="card-body">
                            <form onSubmit={handleShopUpdate}>
                                <div className="text-center mb-4">
                                    <div className="border rounded-circle d-inline-block overflow-hidden shadow-sm" style={{width: '100px', height: '100px'}}>
                                        <img src={preview || 'https://via.placeholder.com/100'} alt="Logo" className="w-100 h-100 object-fit-cover" />
                                    </div>
                                    <div className="mt-2">
                                        <label className="btn btn-sm btn-outline-primary rounded-pill px-3">
                                            📸 Upload Logo
                                            <input type="file" hidden onChange={e => {
                                                setLogo(e.target.files[0]);
                                                setPreview(URL.createObjectURL(e.target.files[0]));
                                            }} />
                                        </label>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small text-muted">Shop Name</label>
                                    <input className="form-control" value={shop.shop_name} onChange={e => setShop({...shop, shop_name: e.target.value})} required />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small text-muted">GST / Tax ID</label>
                                    <input className="form-control" value={shop.gst_number || ''} onChange={e => setShop({...shop, gst_number: e.target.value})} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small text-muted">Address (For Bill)</label>
                                    <textarea className="form-control" rows="2" placeholder="Enter Shop Address"></textarea>
                                </div>

                                <button className="btn btn-primary w-100 fw-bold">Save Profile</button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* PASSWORD CHANGE */}
                <div className="col-12 col-md-6">
                    <div className="card shadow-sm h-100 border-0">
                        <div className="card-header bg-danger text-white fw-bold">Security</div>
                        <div className="card-body">
                            <form onSubmit={handlePassChange}>
                                <div className="mb-3">
                                    <label className="form-label small text-muted">Current Password</label>
                                    <input type="password" className="form-control" value={pass.current} onChange={e => setPass({...pass, current: e.target.value})} required />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small text-muted">New Password</label>
                                    <input type="password" className="form-control" value={pass.new} onChange={e => setPass({...pass, new: e.target.value})} required />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label small text-muted">Confirm Password</label>
                                    <input type="password" className="form-control" value={pass.confirm} onChange={e => setPass({...pass, confirm: e.target.value})} required />
                                </div>
                                <button className="btn btn-danger w-100 fw-bold">Update Password</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsManager;
