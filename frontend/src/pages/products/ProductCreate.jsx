import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import ProductForm from './ProductForm';

export default function ProductCreate() {
  const navigate = useNavigate();

  const onSubmit = async (values) => {
    const fd = new FormData();
    fd.append('name', values.name);
    fd.append('price', values.price);
    if (values.stock != null) fd.append('stock', values.stock);
    fd.append('category', values.category);
    fd.append('description', values.description || '');
    if (values.color) fd.append('color', values.color);
    (values.photos || []).forEach(f => fd.append('photos', f));
    await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    navigate('/admin/products', { state: { toast: { msg: 'Product created successfully', severity: 'success' } } });
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Create Product</h2>
      <ProductForm onSubmit={onSubmit} submitLabel="Create" />
    </div>
  );
}
