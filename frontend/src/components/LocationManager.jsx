import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import Loader from './Loader'; // Import the new Loader

const LocationManager = () => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true); // Start as true
    const [form, setForm] = useState({ floor_name: '', rack_number: '', shelf_number: '' });

    const fetchLocations = async () => {
        setLoading(true); // Show loader before fetching
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/locations', { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) setLocations(res.data.data);
        } catch (error) { console.error(error); }
        finally { setLoading(false); } // Hide loader after finishing
    };

    useEffect(() => { fetchLocations(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/locations', form, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) {
                toast.success('Location Added!');
                setForm({ floor_name: '', rack_number: '', shelf_number: '' });
                fetchLocations();
            }
        } catch (error) { toast.error('Error adding location'); }
    };

    const handleDelete = async (id) => {
        if(!window.confirm('Delete this location?')) return;
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/locations/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Deleted');
            fetchLocations();
        } catch (error) { toast.error('Error deleting'); }
    };

    return (
        <div className="card shadow-sm mt-3">
            <div className="card-header bg-secondary text-white">Manage Racks & Shelves</div>
            <div className="card-body">
                {/* Form */}
                <form onSubmit={handleSubmit} className="row g-2 mb-4">
                    <div className="col-md-4">
                        <input type="text" className="form-control" placeholder="FLOOR (e.g. GROUND)"
                            value={form.floor_name}
                            onChange={e => setForm({...form, floor_name: e.target.value.toUpperCase()})}
                            required />
                    </div>
                    <div className="col-md-4">
                        <input type="text" className="form-control" placeholder="RACK (e.g. A1)"
                            value={form.rack_number}
                            onChange={e => setForm({...form, rack_number: e.target.value.toUpperCase()})}
                            required />
                    </div>
                    <div className="col-md-3">
                        <input type="text" className="form-control" placeholder="SHELF (e.g. S1)"
                            value={form.shelf_number}
                            onChange={e => setForm({...form, shelf_number: e.target.value.toUpperCase()})}
                            required />
                    </div>
                    <div className="col-md-1">
                        <button className="btn btn-primary w-100">ADD</button>
                    </div>
                </form>

                {/* TABLE SECTION */}
                {loading ? (
                    <Loader /> // Show Spinner if loading
                ) : (
                    <table className="table table-bordered table-sm">
                        <thead className="table-light"><tr><th>FLOOR</th><th>RACK</th><th>SHELF</th><th>ACTION</th></tr></thead>
                        <tbody>
                            {locations.length === 0 ? (
                                <tr><td colSpan="4" className="text-center">No Locations Added</td></tr>
                            ) : (
                                locations.map(loc => (
                                    <tr key={loc.id}>
                                        <td>{loc.floor_name}</td>
                                        <td>{loc.rack_number}</td>
                                        <td>{loc.shelf_number}</td>
                                        <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(loc.id)}>X</button></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default LocationManager;
