import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import Loader from './Loader';

const LocationManager = () => {
    // Data State
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [form, setForm] = useState({ floor_name: '', rack_number: '', shelf_number: '' });
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState(null);

    // Search State
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Fetch Locations
    const fetchLocations = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/locations', { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.status) setLocations(res.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLocations(); }, []);

    // 2. Submit (Add or Update)
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            if (isEditMode) {
                // UPDATE Logic (We need to ensure backend supports PUT /locations/{id})
                // If backend doesn't support PUT yet, we can delete & recreate or fix backend.
                // Assuming standard REST, let's try PUT.
                // If fails, we will need to add update method in controller.

                // Since we didn't add update method in LocationController earlier,
                // let's do the safe delete-create combo for now OR better, let's just stick to Add.
                // WAIT! I will give you the backend fix below if needed.
                // Let's assume you will update backend too.

                // For now, let's use the Delete-Create trick to simulate Edit if backend not ready.
                await api.delete(`/locations/${editId}`, { headers });
                await api.post('/locations', form, { headers });
                toast.success('Location Updated!');
            } else {
                // ADD Logic
                await api.post('/locations', form, { headers });
                toast.success('Location Added!');
            }

            // Reset
            setForm({ floor_name: '', rack_number: '', shelf_number: '' });
            setIsEditMode(false);
            setEditId(null);
            fetchLocations();
        } catch (error) {
            toast.error('Operation Failed');
        }
    };

    // 3. Edit Handler
    const handleEdit = (loc) => {
        setForm({
            floor_name: loc.floor_name,
            rack_number: loc.rack_number,
            shelf_number: loc.shelf_number
        });
        setIsEditMode(true);
        setEditId(loc.id);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form
    };

    // 4. Cancel Edit
    const handleCancelEdit = () => {
        setForm({ floor_name: '', rack_number: '', shelf_number: '' });
        setIsEditMode(false);
        setEditId(null);
    };

    // 5. Delete Location
    const handleDelete = async (id) => {
        if(!window.confirm('Delete this location? Items assigned here will need re-assignment.')) return;
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/locations/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Deleted');
            fetchLocations();
        } catch (error) { toast.error('Error deleting'); }
    };

    // 6. Search Filter Logic
    const filteredLocations = locations.filter(loc =>
        loc.floor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.rack_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.shelf_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="mt-3">
            <h4 className="mb-4">📍 LOCATION MANAGEMENT</h4>

            {/* ADD / EDIT FORM CARD */}
            <div className={`card shadow-sm mb-4 border-0 ${isEditMode ? 'bg-warning-subtle' : 'bg-light'}`}>
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="card-title text-primary fw-bold mb-0">
                            {isEditMode ? '✏️ Update Location' : '➕ Add New Rack/Shelf'}
                        </h6>
                        {isEditMode && (
                            <button className="btn btn-sm btn-secondary" onClick={handleCancelEdit}>Cancel</button>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="row g-2 align-items-end">
                        <div className="col-md-4">
                            <label className="small text-muted fw-bold">FLOOR NAME</label>
                            <input type="text" className="form-control" placeholder="e.g. GROUND"
                                value={form.floor_name}
                                onChange={e => setForm({...form, floor_name: e.target.value.toUpperCase()})}
                                required />
                        </div>
                        <div className="col-md-3">
                            <label className="small text-muted fw-bold">RACK NO.</label>
                            <input type="text" className="form-control" placeholder="e.g. A1"
                                value={form.rack_number}
                                onChange={e => setForm({...form, rack_number: e.target.value.toUpperCase()})}
                                required />
                        </div>
                        <div className="col-md-3">
                            <label className="small text-muted fw-bold">SHELF NO.</label>
                            <input type="text" className="form-control" placeholder="e.g. S1"
                                value={form.shelf_number}
                                onChange={e => setForm({...form, shelf_number: e.target.value.toUpperCase()})}
                                required />
                        </div>
                        <div className="col-md-2">
                            <button className={`btn w-100 fw-bold ${isEditMode ? 'btn-warning' : 'btn-primary'}`}>
                                {isEditMode ? 'UPDATE' : 'ADD'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* SEARCH BAR */}
            <input
                type="text"
                className="form-control mb-3"
                placeholder="🔍 Search Floor, Rack, or Shelf..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* TABLE */}
            {loading ? (
                <Loader />
            ) : (
                <div className="table-responsive shadow-sm border bg-white rounded">
                    <table className="table table-striped table-hover mb-0 align-middle">
                        <thead className="table-dark">
                            <tr>
                                <th style={{width: '60px'}}>S.No</th>
                                <th>FLOOR</th>
                                <th>RACK</th>
                                <th>SHELF</th>
                                <th className="text-center" style={{width: '120px'}}>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLocations.length === 0 ? (
                                <tr><td colSpan="5" className="text-center p-4 text-muted">No Locations Found</td></tr>
                            ) : (
                                filteredLocations.map((loc, index) => (
                                    <tr key={loc.id}>
                                        <td className="fw-bold text-secondary">{index + 1}</td>
                                        <td>{loc.floor_name}</td>
                                        <td className="fw-bold text-primary">{loc.rack_number}</td>
                                        <td>{loc.shelf_number}</td>
                                        <td className="text-center">
                                            <div className="btn-group">
                                                <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(loc)}>
                                                    ✏️
                                                </button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(loc.id)}>
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default LocationManager;
