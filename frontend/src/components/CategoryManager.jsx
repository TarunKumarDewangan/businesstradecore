import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import Loader from './Loader'; // Import Loader

const CategoryManager = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true); // Loading State
    const [name, setName] = useState('');
    const [type, setType] = useState('main');
    const [parentId, setParentId] = useState('');

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/categories', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.status) {
                setCategories(response.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const payload = {
                name: name,
                type: type,
                parent_id: type === 'sub' ? parentId : null
            };

            const response = await api.post('/categories', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.status) {
                toast.success('Category Added!');
                setName('');
                fetchCategories();
            }
        } catch (error) {
            toast.error('Failed to add category');
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Are you sure? This will delete all subcategories too.")) return;
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/categories/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Deleted!');
            fetchCategories();
        } catch (error) {
            toast.error('Error deleting');
        }
    };

    return (
        <div className="card shadow-sm mt-3">
            <div className="card-header bg-dark text-white">
                <h5 className="mb-0">INVENTORY CATEGORIES</h5>
            </div>
            <div className="card-body">
                <form onSubmit={handleSubmit} className="row g-2 align-items-end mb-4 border-bottom pb-4">
                    <div className="col-md-4">
                        <label className="form-label">CATEGORY NAME</label>
                        <input
                            type="text"
                            className="form-control"
                            value={name}
                            onChange={(e) => setName(e.target.value.toUpperCase())}
                            required
                            placeholder="e.g. ENGINE"
                        />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">TYPE</label>
                        <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                            <option value="main">MAIN CATEGORY</option>
                            <option value="sub">SUB CATEGORY</option>
                        </select>
                    </div>

                    {type === 'sub' && (
                        <div className="col-md-3">
                            <label className="form-label">PARENT CATEGORY</label>
                            <select className="form-select" required value={parentId} onChange={(e) => setParentId(e.target.value)}>
                                <option value="">SELECT PARENT...</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="col-md-2">
                        <button type="submit" className="btn btn-primary w-100">ADD</button>
                    </div>
                </form>

                <h6>EXISTING CATEGORIES</h6>
                {loading ? (
                    <Loader />
                ) : (
                    <ul className="list-group">
                        {categories.length === 0 ? <p className="text-muted">No Categories Found</p> : ''}
                        {categories.map((cat) => (
                            <li key={cat.id} className="list-group-item">
                                <div className="d-flex justify-content-between align-items-center">
                                    <strong>{cat.name}</strong>
                                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(cat.id)}>DELETE</button>
                                </div>

                                {cat.subcategories && cat.subcategories.length > 0 && (
                                    <ul className="mt-2 text-muted">
                                        {cat.subcategories.map(sub => (
                                            <li key={sub.id}>- {sub.name}</li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default CategoryManager;
