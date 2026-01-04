import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Modal, Form } from 'react-bootstrap';
import Loader from './Loader';

const ItemManager = () => {
    // Data State
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState(''); // Search State

    // Pagination State
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const [form, setForm] = useState({
        item_name: '', part_number: '', compatible_models: '',
        category_id: '', location_id: '',
        purchase_price: '', selling_price: '', stock_quantity: ''
    });

    /* =========================
       LOAD ITEMS (With Search)
    ========================= */
    const loadItems = async (pageNo = 1, search = searchTerm) => {
        setLoading(true);
        try {
            // Pass search param to backend
            const res = await api.get(`/items?page=${pageNo}&search=${search}`, { headers });

            setItems(res.data.data.data);
            setLastPage(res.data.data.last_page);
            setTotalItems(res.data.data.total);
            setPage(pageNo);

        } catch {
            toast.error('Failed to load items');
        } finally {
            setLoading(false);
        }
    };

    /* =========================
       LIVE SEARCH EFFECT
    ========================= */
    useEffect(() => {
        // Debounce: Wait 500ms after typing stops before calling API
        const delayDebounceFn = setTimeout(() => {
            loadItems(1, searchTerm); // Always reset to page 1 on search
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    /* =========================
       LOAD META DATA
    ========================= */
    const loadMeta = async () => {
        try {
            const [catRes, locRes] = await Promise.all([
                api.get('/categories', { headers }),
                api.get('/locations', { headers })
            ]);
            setCategories(catRes.data.data);
            setLocations(locRes.data.data);
        } catch {
            // Silent fail
        }
    };

    useEffect(() => {
        loadMeta();
        // Note: loadItems is called by the search useEffect initially
    }, []);

    /* =========================
       SUBMIT ITEM
    ========================= */
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/items', form, { headers });
            toast.success('Item Added Successfully');
            setShowModal(false);
            loadItems(1);
            setForm({
                item_name: '', part_number: '', compatible_models: '',
                category_id: '', location_id: '', purchase_price: '',
                selling_price: '', stock_quantity: ''
            });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Validation Error');
        }
    };

    /* =========================
       DELETE ITEM
    ========================= */
    const handleDelete = async (id) => {
        if (!window.confirm('Delete this item?')) return;
        try {
            await api.delete(`/items/${id}`, { headers });
            toast.success('Item Deleted');
            loadItems(page);
        } catch {
            toast.error('Delete failed');
        }
    };

    return (
        <div className="mt-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4>STOCK INVENTORY <span className="text-muted fs-6">({totalItems})</span></h4>
                <button className="btn btn-success" onClick={() => setShowModal(true)}>
                    + ADD NEW PART
                </button>
            </div>

            {/* SEARCH BAR */}
            <div className="mb-3">
                <input
                    type="text"
                    className="form-control form-control-lg border-primary"
                    placeholder="🔍 Search by Name, Part Number, or Model..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? <Loader /> : (
                <>
                    <div className="table-responsive shadow-sm border bg-white">
                        <table className="table table-striped table-hover mb-0">
                            <thead className="table-dark">
                                <tr>
                                    <th>ITEM</th>
                                    <th>CATEGORY</th>
                                    <th>LOCATION</th>
                                    <th>STOCK</th>
                                    <th>PRICE</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center p-5 text-muted">No Items Found</td></tr>
                                ) : items.map(i => (
                                    <tr key={i.id}>
                                        <td>
                                            <b>{i.item_name}</b><br />
                                            <small className="text-muted">{i.part_number}</small>
                                        </td>
                                        <td>{i.category?.name}</td>
                                        <td>
                                            {i.location
                                                ? `${i.location.floor_name}-${i.location.rack_number}-${i.location.shelf_number}`
                                                : <span className="text-muted">--</span>}
                                        </td>
                                        <td className={i.stock_quantity < 5 ? 'text-danger fw-bold' : ''}>
                                            {i.stock_quantity}
                                        </td>
                                        <td>₹{i.selling_price}</td>
                                        <td>
                                            <button className="btn btn-sm btn-danger"
                                                onClick={() => handleDelete(i.id)}>
                                                DEL
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION CONTROLS */}
                    {items.length > 0 && (
                        <div className="d-flex justify-content-between align-items-center mt-3 p-2 bg-white border rounded">
                            <button
                                className="btn btn-outline-primary btn-sm"
                                disabled={page <= 1}
                                onClick={() => loadItems(page - 1)}>
                                &laquo; Previous
                            </button>

                            <span className="fw-bold text-secondary">
                                Page {page} of {lastPage}
                            </span>

                            <button
                                className="btn btn-outline-primary btn-sm"
                                disabled={page >= lastPage}
                                onClick={() => loadItems(page + 1)}>
                                Next &raquo;
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* ADD MODAL (Same as before) */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Add Item</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit} className="row g-3">
                        <div className="col-md-6">
                            <label>Item Name *</label>
                            <input className="form-control" required
                                value={form.item_name}
                                onChange={e => setForm({ ...form, item_name: e.target.value.toUpperCase() })} />
                        </div>
                        <div className="col-md-6">
                            <label>Part Number</label>
                            <input className="form-control"
                                value={form.part_number}
                                onChange={e => setForm({ ...form, part_number: e.target.value.toUpperCase() })} />
                        </div>
                        <div className="col-md-6">
                            <label>Category *</label>
                            <select className="form-select" required
                                value={form.category_id}
                                onChange={e => setForm({ ...form, category_id: e.target.value })}>
                                <option value="">Select Category</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label>Location</label>
                            <select className="form-select"
                                value={form.location_id}
                                onChange={e => setForm({ ...form, location_id: e.target.value })}>
                                <option value="">Select Location</option>
                                {locations.map(l => (
                                    <option key={l.id} value={l.id}>
                                        {l.floor_name}-{l.rack_number}-{l.shelf_number}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-12">
                            <label>Compatible Models</label>
                            <input className="form-control"
                                value={form.compatible_models}
                                onChange={e => setForm({ ...form, compatible_models: e.target.value.toUpperCase() })} />
                        </div>
                        <div className="col-md-4">
                            <label>Purchase Price</label>
                            <input type="number" className="form-control"
                                value={form.purchase_price}
                                onChange={e => setForm({ ...form, purchase_price: e.target.value })} />
                        </div>
                        <div className="col-md-4">
                            <label>Selling Price *</label>
                            <input type="number" className="form-control" required
                                value={form.selling_price}
                                onChange={e => setForm({ ...form, selling_price: e.target.value })} />
                        </div>
                        <div className="col-md-4">
                            <label>Opening Stock *</label>
                            <input type="number" className="form-control" required
                                value={form.stock_quantity}
                                onChange={e => setForm({ ...form, stock_quantity: e.target.value })} />
                        </div>
                        <div className="col-12 mt-3">
                            <button className="btn btn-primary w-100">Save Item</button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default ItemManager;
