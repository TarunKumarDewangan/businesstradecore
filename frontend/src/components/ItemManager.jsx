import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Modal, Form, Button, Pagination } from 'react-bootstrap';
import Loader from './Loader';

const ItemManager = () => {
    // Data State
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]); // Filtered Subcats
    const [locations, setLocations] = useState([]);
    const [loadingItems, setLoadingItems] = useState(true);

    // UI State
    const [showModal, setShowModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination State
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [perPage, setPerPage] = useState(10);

    const token = localStorage.getItem('token');
    const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

    const initialFormState = {
        item_name: '', part_number: '', compatible_models: '',
        category_id: '', subcategory_id: '', // Added subcategory
        location_id: '',
        purchase_price: '', selling_price: '', stock_quantity: ''
    };
    const [form, setForm] = useState(initialFormState);

    /* =========================
       LOAD ITEMS
    ========================= */
    const loadItems = useCallback(async (pageNo = 1, search = searchTerm) => {
        setLoadingItems(true);
        try {
            const res = await api.get(
                `/items?page=${pageNo}&search=${encodeURIComponent(search)}`,
                { headers }
            );
            const data = res.data.data;
            setItems(data.data);
            setPage(data.current_page);
            setLastPage(data.last_page);
            setTotalItems(data.total);
            setPerPage(data.per_page);
        } catch {
            toast.error('Failed to load items');
        } finally {
            setLoadingItems(false);
        }
    }, [headers, searchTerm]);

    /* =========================
       LOAD META DATA
    ========================= */
    const loadMeta = async () => {
        if (categories.length && locations.length) return;
        try {
            const [catRes, locRes] = await Promise.all([
                api.get('/categories', { headers }),
                api.get('/locations', { headers })
            ]);
            setCategories(catRes.data.data || []);
            setLocations(locRes.data.data || []);
        } catch {
            toast.error('Failed to load meta data');
        }
    };

    useEffect(() => {
        loadItems(1, '');
        loadMeta();
    }, [loadItems]);

    /* =========================
       SEARCH EFFECT
    ========================= */
    useEffect(() => {
        const timer = setTimeout(() => {
            loadItems(1, searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, loadItems]);

    /* =========================
       HANDLE CATEGORY CHANGE
    ========================= */
    const handleCategoryChange = (e) => {
        const catId = e.target.value;
        setForm({ ...form, category_id: catId, subcategory_id: '' }); // Reset subcat

        // Find selected category to get its subcategories
        const selectedCat = categories.find(c => c.id == catId);
        setSubCategories(selectedCat ? selectedCat.subcategories : []);
    };

    /* =========================
       MODAL HANDLERS
    ========================= */
    const openAddModal = () => {
        setIsEditMode(false);
        setForm(initialFormState);
        setSubCategories([]); // Clear subcats
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setIsEditMode(true);
        setEditId(item.id);

        // Populate Subcategories for the selected Main Category
        const selectedCat = categories.find(c => c.id == item.category_id);
        setSubCategories(selectedCat ? selectedCat.subcategories : []);

        setForm({
            item_name: item.item_name || '',
            part_number: item.part_number || '',
            compatible_models: item.compatible_models || '',
            category_id: item.category_id || '',
            subcategory_id: item.subcategory_id || '', // Load Subcat
            location_id: item.location_id || '',
            purchase_price: item.purchase_price || 0,
            selling_price: item.selling_price || 0,
            stock_quantity: item.stock_quantity || 0
        });
        setShowModal(true);
    };

    /* =========================
       SUBMIT
    ========================= */
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditMode) {
                await api.put(`/items/${editId}`, form, { headers });
                toast.success('Item Updated Successfully');
            } else {
                await api.post('/items', form, { headers });
                toast.success('Item Added Successfully');
            }
            setShowModal(false);
            loadItems(page, searchTerm);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed');
        }
    };

    /* =========================
       DELETE
    ========================= */
    const handleDelete = async (id) => {
        if (!window.confirm('Delete this item?')) return;
        try {
            await api.delete(`/items/${id}`, { headers });
            toast.success('Item Deleted');
            loadItems(page, searchTerm);
        } catch {
            toast.error('Delete failed');
        }
    };

    const isInitialLoading = loadingItems && items.length === 0;

    /* =========================
       RENDER PAGINATION
    ========================= */
    const renderPagination = () => {
        if (lastPage <= 1) return null;
        return (
            <div className="d-flex justify-content-center mt-3">
                <Pagination>
                    <Pagination.First disabled={page === 1} onClick={() => loadItems(1, searchTerm)} />
                    <Pagination.Prev disabled={page === 1} onClick={() => loadItems(page - 1, searchTerm)} />
                    <Pagination.Item active>{page}</Pagination.Item>
                    <Pagination.Next disabled={page === lastPage} onClick={() => loadItems(page + 1, searchTerm)} />
                    <Pagination.Last disabled={page === lastPage} onClick={() => loadItems(lastPage, searchTerm)} />
                </Pagination>
            </div>
        );
    };

    return (
        <div className="mt-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4>
                    STOCK INVENTORY{' '}
                    <span className="text-muted fs-6">({totalItems})</span>
                </h4>
                <Button variant="success" className="fw-bold" onClick={openAddModal}>
                    + ADD NEW PART
                </Button>
            </div>

            <input
                type="text"
                className="form-control form-control-lg mb-3 shadow-sm border-primary"
                placeholder="🔍 Search by Name, Part Number, or Model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {isInitialLoading ? <Loader /> : (
                <>
                    <div className="table-responsive shadow-sm border bg-white rounded">
                        <table className="table table-striped table-hover mb-0 align-middle">
                            <thead className="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>ITEM</th>
                                    <th>CATEGORY</th>
                                    <th>LOCATION</th>
                                    <th>STOCK</th>
                                    <th>PRICE</th>
                                    <th className="text-center">ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr><td colSpan="7" className="text-center p-5 text-muted">No Items Found</td></tr>
                                ) : items.map((i, index) => (
                                    <tr key={i.id}>
                                        <td className="fw-bold text-secondary">
                                            {(page - 1) * perPage + index + 1}
                                        </td>
                                        <td>
                                            <span className="fw-bold d-block">{i.item_name}</span>
                                            <small className="text-muted">{i.part_number || '-'}</small>
                                        </td>
                                        <td>
                                            {i.category?.name || '--'}
                                            {/* (Optional) Show subcat if you want in list */}
                                            {/* {i.subcategory_id ? <small className='d-block text-muted'>Sub: ...</small> : ''} */}
                                        </td>
                                        <td>
                                            {i.location ? (
                                                <span className="badge bg-secondary">
                                                    {i.location.floor_name}-{i.location.rack_number}-{i.location.shelf_number}
                                                </span>
                                            ) : '--'}
                                        </td>
                                        <td className={i.stock_quantity < 5 ? 'text-danger fw-bold' : 'fw-bold'}>
                                            {i.stock_quantity}
                                        </td>
                                        <td>₹{i.selling_price}</td>
                                        <td className="text-center">
                                            <div className="btn-group">
                                                <Button variant="outline-primary" size="sm" onClick={() => openEditModal(i)}>✏️</Button>
                                                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(i.id)}>🗑️</Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {items.length > 0 && renderPagination()}
                </>
            )}

            {/* ADD / EDIT MODAL */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" backdrop="static">
                <Modal.Header closeButton>
                    <Modal.Title>{isEditMode ? 'Update Item' : 'Add New Item'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit} className="row g-3">
                        <div className="col-md-6">
                            <Form.Label>Item Name *</Form.Label>
                            <Form.Control required value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value.toUpperCase() })} />
                        </div>
                        <div className="col-md-6">
                            <Form.Label>Part Number</Form.Label>
                            <Form.Control value={form.part_number} onChange={e => setForm({ ...form, part_number: e.target.value.toUpperCase() })} />
                        </div>

                        {/* CATEGORY & SUBCATEGORY */}
                        <div className="col-md-4">
                            <Form.Label>Category *</Form.Label>
                            <Form.Select required value={form.category_id} onChange={handleCategoryChange}>
                                <option value="">Select Category</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </Form.Select>
                        </div>
                        <div className="col-md-4">
                            <Form.Label>Sub Category (Optional)</Form.Label>
                            <Form.Select
                                value={form.subcategory_id}
                                onChange={e => setForm({ ...form, subcategory_id: e.target.value })}
                                disabled={subCategories.length === 0}
                            >
                                <option value="">-- Select --</option>
                                {subCategories.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </Form.Select>
                        </div>

                        <div className="col-md-4">
                            <Form.Label>Location</Form.Label>
                            <Form.Select value={form.location_id} onChange={e => setForm({ ...form, location_id: e.target.value })}>
                                <option value="">Select Location</option>
                                {locations.map(l => (
                                    <option key={l.id} value={l.id}>{l.floor_name}-{l.rack_number}-{l.shelf_number}</option>
                                ))}
                            </Form.Select>
                        </div>

                        <div className="col-12">
                            <Form.Label>Compatible Models</Form.Label>
                            <Form.Control value={form.compatible_models} onChange={e => setForm({ ...form, compatible_models: e.target.value.toUpperCase() })} placeholder="e.g. SPLENDOR" />
                        </div>

                        {!isEditMode && (
                            <div className="col-md-4">
                                <Form.Label>Purchase Price</Form.Label>
                                <Form.Control type="number" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} />
                            </div>
                        )}
                        <div className={isEditMode ? 'col-md-6' : 'col-md-4'}>
                            <Form.Label>Selling Price *</Form.Label>
                            <Form.Control type="number" required value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })} />
                        </div>
                        <div className={isEditMode ? 'col-md-6' : 'col-md-4'}>
                            <Form.Label>Stock *</Form.Label>
                            <Form.Control type="number" required value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} />
                        </div>
                        <div className="col-12 mt-4">
                            <Button variant="primary" type="submit" className="w-100 fw-bold py-2">
                                {isEditMode ? 'UPDATE ITEM' : 'SAVE ITEM'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default ItemManager;
