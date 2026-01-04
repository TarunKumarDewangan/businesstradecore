import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';

const PartnerManager = () => {
    const [partners, setPartners] = useState([]);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [vehicle, setVehicle] = useState('');

    const fetchPartners = async () => {
        const token = localStorage.getItem('token');
        const res = await api.get('/partners', { headers: { Authorization: `Bearer ${token}` } });
        if(res.data.status) setPartners(res.data.data);
    };

    useEffect(() => { fetchPartners(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        await api.post('/partners', { name, phone, vehicle_number: vehicle }, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Partner Added');
        fetchPartners();
        setName(''); setPhone(''); setVehicle('');
    };

    return (
        <div className="mt-3">
            <h5>🚚 Delivery Partners</h5>
            <form onSubmit={handleSubmit} className="d-flex gap-2 mb-3">
                <input placeholder="Name" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
                <input placeholder="Phone" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} required />
                <input placeholder="Vehicle No" className="form-control" value={vehicle} onChange={e => setVehicle(e.target.value)} />
                <button className="btn btn-primary">Add</button>
            </form>
            <ul className="list-group">
                {partners.map(p => (
                    <li key={p.id} className="list-group-item d-flex justify-content-between">
                        <span>{p.name} - {p.vehicle_number}</span>
                        <span className="badge bg-secondary">{p.phone}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
export default PartnerManager;
