import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../utils/api';
import ProductForm from './ProductForm';

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await api.get(`/products/${id}`);
      if (active) setInitial(res.data);
    })();
    return () => { active = false; };
  }, [id]);

  const onSubmit = async (values) => {
    const fd = new FormData();
    if (values.name != null) fd.append('name', values.name);
    if (values.price != null) fd.append('price', values.price);
    if (values.stock != null) fd.append('stock', values.stock);
    if (values.category != null) fd.append('category', values.category);
    if (values.description != null) fd.append('description', values.description);
    if (values.color != null) fd.append('color', values.color);
    if (values.keepPhotoIds) fd.append('keepPhotoIds', JSON.stringify(values.keepPhotoIds));
    (values.photos || []).forEach(f => fd.append('photos', f));
    await api.put(`/products/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    navigate('/products', { state: { toast: { msg: 'Product updated successfully', severity: 'success' } } });
  };

  if (!initial) return <div className="text-gray-500">Loading…</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Edit Product</h2>
      <ProductForm initialValues={initial} onSubmit={onSubmit} submitLabel="Update" isEdit />
    </div>
  );
}
