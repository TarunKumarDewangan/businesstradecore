import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Modal, Button, Form, Badge } from 'react-bootstrap';
import Loader from './Loader';

const CategoryManager = () => {
    // Data State
    const [originalData, setOriginalData] = useState([]);
    const [flatList, setFlatList] = useState([]);
    const [filteredList, setFilteredList] = useState([]);

    // UI State
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState(null);

    // Form State
    const [form, setForm] = useState({ name: '', type: 'main', parent_id: '' });

    // Merge State
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [targetCategory, setTargetCategory] = useState('');

    // 1. Fetch Data
    const fetchCategories = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/categories', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.status) {
                setOriginalData(response.data.data);
                processData(response.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCategories(); }, []);

    // 2. Process Data
    const processData = (data) => {
        let flat = [];
        let counter = 1;

        data.forEach(main => {
            flat.push({
                ...main,
                parent_name: '-',
                is_main: true,
                display_sno: counter++
            });

            if (main.subcategories && main.subcategories.length > 0) {
                main.subcategories.forEach(sub => {
                    flat.push({
                        ...sub,
                        parent_name: main.name,
                        is_main: false,
                        display_sno: ''
                    });
                });
            }
        });
        setFlatList(flat);
        setFilteredList(flat);
    };

    // 3. Search Logic
    const handleSearch = (e) => {
        const term = e.target.value.toLowerCase();
        setSearchTerm(term);

        const filtered = flatList.filter(item =>
            item.name.toLowerCase().includes(term) ||
            item.parent_name.toLowerCase().includes(term)
        );
        setFilteredList(filtered);
    };

    // 4. Submit Add/Edit
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const payload = {
                name: form.name,
                type: form.type,
                parent_id: form.type === 'sub' ? form.parent_id : null
            };

            if (isEditMode) {
                await api.put(`/categories/${editId}`, payload, { headers });
                toast.success('Category Updated!');
            } else {
                await api.post('/categories', payload, { headers });
                toast.success('Category Added!');
            }

            setShowModal(false);
            fetchCategories();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation Failed');
        }
    };

    // 5. Delete Logic
    const handleDelete = async (cat) => {
        if(!window.confirm(`Delete ${cat.name}?`)) return;
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/categories/${cat.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Deleted!');
            fetchCategories();
        } catch (error) {
            if (error.response?.status === 400) {
                setCategoryToDelete(cat);
                setTargetCategory('');
                setShowMergeModal(true);
            } else {
                toast.error(error.response?.data?.message || 'Error deleting');
            }
        }
    };

    // 6. Merge & Delete Submit
    const handleMergeDelete = async () => {
        if(!targetCategory) return toast.warning('Select a destination category');
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            await api.post('/categories/move-delete', {
                delete_id: categoryToDelete.id,
                move_to_id: targetCategory
            }, { headers });

            toast.success('Items Moved & Category Deleted!');
            setShowMergeModal(false);
            fetchCategories();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed');
        }
    };

    // Modal Helpers
    const openAddModal = () => {
        setIsEditMode(false);
        setForm({ name: '', type: 'main', parent_id: '' });
        setShowModal(true);
    };

    const openEditModal = (cat) => {
        setIsEditMode(true);
        setEditId(cat.id);
        setForm({
            name: cat.name,
            type: cat.is_main ? 'main' : 'sub',
            parent_id: cat.parent_id || ''
        });
        setShowModal(true);
    };

    // Helper: Filter Valid Destinations
    const getValidDestinations = () => {
        if (!categoryToDelete) return [];
        return flatList.filter(c => {
            // 1. Cannot move to itself
            if (c.id === categoryToDelete.id) return false;

            // 2. If deleting a Main Category, prevent selecting its OWN subcategories
            // (Because if Main goes, Subs go too)
            if (categoryToDelete.is_main && c.parent_name === categoryToDelete.name) return false;

            return true;
        });
    };

    return (
        <div className="mt-3">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
                <h4 className="mb-0">INVENTORY CATEGORIES</h4>
                <div className="d-flex gap-2 w-100 w-md-auto">
                    <input type="text" className="form-control" placeholder="🔍 Search..." value={searchTerm} onChange={handleSearch} />
                    <button className="btn btn-primary fw-bold text-nowrap" onClick={openAddModal}>+ ADD CATEGORY</button>
                </div>
            </div>

            {loading ? <Loader /> : (
                <div className="table-responsive shadow-sm border bg-white rounded">
                    <table className="table table-striped table-hover mb-0 align-middle">
                        <thead className="table-dark">
                            <tr>
                                <th style={{width: '60px'}}>S.No</th>
                                <th>Category Name</th>
                                <th>Type</th>
                                <th>Parent Category</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredList.map((cat) => (
                                <tr key={cat.id}>
                                    <td className="fw-bold text-secondary text-center">{cat.display_sno}</td>
                                    <td>
                                        <span className={cat.is_main ? 'fw-bold text-dark' : 'ms-4 text-secondary'}>
                                            {cat.is_main ? '' : '↳ '} {cat.name}
                                        </span>
                                    </td>
                                    <td>
                                        <Badge bg={cat.is_main ? 'primary' : 'info'}>
                                            {cat.is_main ? 'MAIN' : 'SUB'}
                                        </Badge>
                                    </td>
                                    <td>{cat.parent_name}</td>
                                    <td className="text-center">
                                        <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEditModal(cat)}>✏️ Edit</button>
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(cat)}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ADD/EDIT MODAL */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditMode ? 'Edit Category' : 'Add New Category'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Name</Form.Label>
                            <Form.Control type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value.toUpperCase()})} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Type</Form.Label>
                            <Form.Select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} disabled={isEditMode}>
                                <option value="main">Main Category</option>
                                <option value="sub">Sub Category</option>
                            </Form.Select>
                        </Form.Group>
                        {form.type === 'sub' && (
                            <Form.Group className="mb-3">
                                <Form.Label>Parent</Form.Label>
                                <Form.Select value={form.parent_id} onChange={e => setForm({...form, parent_id: e.target.value})} required>
                                    <option value="">Select Parent...</option>
                                    {originalData.map(main => <option key={main.id} value={main.id}>{main.name}</option>)}
                                </Form.Select>
                            </Form.Group>
                        )}
                        <Button className="w-100 mt-2" type="submit">{isEditMode ? 'Update' : 'Save'}</Button>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* SMART MERGE MODAL */}
            <Modal show={showMergeModal} onHide={() => setShowMergeModal(false)} backdrop="static" centered>
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title>⚠️ Move Items & Delete</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="lead text-danger"><strong>"{categoryToDelete?.name}"</strong> contains items.</p>
                    <p>Select a destination (Main or Sub) to move these items to:</p>

                    <Form.Group>
                        <Form.Label className="fw-bold">Move To Category:</Form.Label>
                        <Form.Select
                            value={targetCategory}
                            onChange={e => setTargetCategory(e.target.value)}
                            size="lg"
                        >
                            <option value="">-- Select Destination --</option>
                            {getValidDestinations().map(cat => (
                                <option key={cat.id} value={cat.id}>
                                    {/* CLEARLY SHOW IF IT IS MAIN OR SUB */}
                                    {cat.is_main ? `📂 ${cat.name} (Main)` : `↳ ${cat.name} (Sub)`}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowMergeModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleMergeDelete} disabled={!targetCategory}>Move & Delete</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default CategoryManager;
