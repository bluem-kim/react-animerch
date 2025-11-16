import { useEffect, useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { api, toFormData } from '../../utils/api';
import { Box, TextField, Select, MenuItem, FormControl, InputLabel, FormHelperText, Button, Card, CardContent, Typography, Grid, IconButton, Checkbox, InputAdornment } from '@mui/material';
import { Delete, CloudUpload } from '@mui/icons-material';

const schema = Yup.object({
  name: Yup.string().required('Required'),
  price: Yup.number().typeError('Must be a number').min(0, '>= 0').required('Required'),
  category: Yup.string().required('Required'),
  color: Yup.string().max(40, 'Too long'),
  description: Yup.string().max(2000, 'Too long'),
  stock: Yup.number().typeError('Must be a number').min(0, '>= 0').required('Required')
});

export default function ProductForm({ initialValues, onSubmit, submitLabel = 'Save', isEdit = false }) {
  const [existingPhotos, setExistingPhotos] = useState([]); // { url, public_id }
  const [keepPhotoIds, setKeepPhotoIds] = useState([]); // public_id[] to keep
  const [newPreviews, setNewPreviews] = useState([]); // previews for newly selected files
  const [selectionMode, setSelectionMode] = useState(false); // bulk selection toggle
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]); // ids chosen for bulk removal
  const [categories, setCategories] = useState([]); // available categories
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    const init = initialValues?.photos || [];
    if (isEdit && init.length) {
      setExistingPhotos(init);
      setKeepPhotoIds(init.map(p => p.public_id));
    }
  }, [isEdit, initialValues]);

  useEffect(() => {
    // Fetch categories
    (async () => {
      try {
        const { data } = await api.get('/categories', { params: { activeOnly: true } });
        setCategories(data.categories || []);
      } catch (e) {
        console.error('Failed to fetch categories:', e);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    })();
  }, []);

  const handleFilesChange = (files, setFieldValue) => {
    const arr = Array.from(files || []);
    setFieldValue('photos', arr);
    const urls = arr.map((f, idx) => ({ name: f.name, url: URL.createObjectURL(f), idx }));
    setNewPreviews(urls);
  };

  const toggleRemoveExisting = (public_id) => {
    setKeepPhotoIds(prev => prev.includes(public_id) ? prev.filter(id => id !== public_id) : [...prev, public_id]);
  };

  const toggleSelected = (public_id) => {
    setSelectedPhotoIds(prev => prev.includes(public_id) ? prev.filter(id => id !== public_id) : [...prev, public_id]);
  };

  const removeSelectedBulk = () => {
    if (!selectedPhotoIds.length) return;
    setKeepPhotoIds(prev => prev.filter(id => !selectedPhotoIds.includes(id)));
    setSelectedPhotoIds([]);
    setSelectionMode(false);
  };

  const removeAllExisting = () => {
    if (!existingPhotos.length) return;
    setKeepPhotoIds([]);
    setSelectedPhotoIds([]);
    setSelectionMode(false);
  };

  return (
    <Card>
      <CardContent>
        <Formik
          initialValues={{ name: '', price: '', category: '', color: '', description: '', stock: 0, photos: [], ...initialValues }}
          validationSchema={schema}
          onSubmit={async (values, helpers) => {
            try {
              await onSubmit({ ...values, keepPhotoIds });
            } catch (e) {
              // Let parent page handle navigation/toasts; keep console signal for debugging
              console.error('ProductForm submit failed:', e);
            } finally {
              helpers.setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting, setFieldValue, errors, touched }) => (
            <Form>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Name */}
                <Field name="name">
                  {({ field, meta }) => (
                    <TextField
                      {...field}
                      label="Name"
                      placeholder="Enter product name"
                      fullWidth
                      error={meta.touched && !!meta.error}
                      helperText={meta.touched && meta.error}
                    />
                  )}
                </Field>

                {/* Price, Stock, Category & Color */}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Field name="price">
                      {({ field, meta }) => (
                        <TextField
                          {...field}
                          label="Price"
                          type="number"
                          inputProps={{ 
                            step: '0.01',
                            min: '0'
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start" sx={{ pointerEvents: 'none', color: 'text.secondary' }}>
                                ₱
                              </InputAdornment>
                            ),
                            sx: {
                              '& .MuiInputBase-input': {
                                outline: 'none',
                                boxShadow: 'none'
                              },
                              '& .MuiInputBase-input:focus': {
                                outline: 'none',
                                boxShadow: 'none'
                              }
                            }
                          }}
                          fullWidth
                          error={meta.touched && !!meta.error}
                          helperText={meta.touched && meta.error}
                        />
                      )}
                    </Field>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Field name="stock">
                      {({ field, meta }) => (
                        <TextField
                          {...field}
                          label="Stock"
                          type="number"
                          inputProps={{ 
                            step: '1',
                            min: '0'
                          }}
                          InputProps={{
                            sx: {
                              '& .MuiInputBase-input': {
                                outline: 'none',
                                boxShadow: 'none'
                              },
                              '& .MuiInputBase-input:focus': {
                                outline: 'none',
                                boxShadow: 'none'
                              }
                            }
                          }}
                          fullWidth
                          error={meta.touched && !!meta.error}
                          helperText={meta.touched && meta.error}
                        />
                      )}
                    </Field>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <Field name="category">
                      {({ field, meta }) => (
                        <TextField
                          {...field}
                          select
                          label="Category"
                          fullWidth
                          error={meta.touched && !!meta.error}
                          helperText={meta.touched && meta.error}
                          InputLabelProps={{ shrink: true }}
                          SelectProps={{
                            displayEmpty: true,
                            renderValue: (selected) => selected ? selected : (
                              <Box component="span" sx={{ color: 'text.secondary' }}>Select a category</Box>
                            )
                          }}
                        >
                          <MenuItem value="">
                            <em>{loadingCategories ? 'Loading categories...' : 'Select a category'}</em>
                          </MenuItem>
                          {(function() {
                            const list = categories.filter(cat => cat.isActive !== false);
                            const exists = list.some(cat => cat.name === (initialValues?.category || ''));
                            // If the current product's category isn't in the active list (or list is empty), include it so MUI select doesn't warn
                            const augmented = (!exists && initialValues?.category) ? [{ _id: '__current__', name: initialValues.category, isActive: false }, ...list] : list;
                            return augmented;
                          })()
                            .map((cat) => (
                              <MenuItem key={cat._id} value={cat.name}>
                                {cat.name}
                              </MenuItem>
                            ))}
                        </TextField>
                      )}
                    </Field>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Field name="color">
                      {({ field, meta }) => (
                        <TextField
                          {...field}
                          label="Color"
                          placeholder="e.g. Red"
                          fullWidth
                          error={meta.touched && !!meta.error}
                          helperText={meta.touched && meta.error}
                        />
                      )}
                    </Field>
                  </Grid>
                </Grid>

                {/* Description */}
                <Field name="description">
                  {({ field, meta }) => (
                    <TextField
                      {...field}
                      label="Description"
                      multiline
                      rows={4}
                      fullWidth
                      error={meta.touched && !!meta.error}
                      helperText={meta.touched && meta.error}
                    />
                  )}
                </Field>

                {/* Photos */}
                <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Photos</Typography>
                  {isEdit && (
                    <Box>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setSelectionMode(m => !m)}
                          disabled={!existingPhotos.length}
                        >
                          {selectionMode ? 'Cancel Bulk' : 'Bulk Select'}
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          onClick={removeSelectedBulk}
                          disabled={!selectionMode || !selectedPhotoIds.length}
                        >
                          Remove Selected ({selectedPhotoIds.length})
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          onClick={removeAllExisting}
                          disabled={!existingPhotos.length}
                        >
                          Remove All
                        </Button>
                        {!!selectedPhotoIds.length && selectionMode && (
                          <Typography variant="caption" sx={{ alignSelf: 'center', color: 'text.secondary' }}>
                            Selected {selectedPhotoIds.length}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 1.5 }}>
                        {existingPhotos.length === 0 && (
                          <Typography variant="body2" color="text.secondary">No existing photos</Typography>
                        )}
                        {existingPhotos.map((p) => {
                          const kept = keepPhotoIds.includes(p.public_id);
                          const selected = selectedPhotoIds.includes(p.public_id);
                          return (
                            <Box
                              key={p.public_id}
                              sx={{
                                position: 'relative',
                                height: 80,
                                width: 80,
                                borderRadius: 1,
                                overflow: 'hidden',
                                border: 1,
                                borderColor: kept ? 'divider' : 'error.main',
                                ...(selectionMode && selected && { boxShadow: theme => `0 0 0 2px ${theme.palette.primary.main}` })
                              }}
                            >
                              <Box
                                component="img"
                                src={p.url}
                                alt={p.public_id}
                                sx={{
                                  height: '100%',
                                  width: '100%',
                                  objectFit: 'cover',
                                  opacity: kept ? 1 : 0.4,
                                  cursor: selectionMode ? 'pointer' : 'default'
                                }}
                                onClick={() => selectionMode ? toggleSelected(p.public_id) : toggleRemoveExisting(p.public_id)}
                              />
                              {!selectionMode && (
                                <Button
                                  size="small"
                                  onClick={() => toggleRemoveExisting(p.public_id)}
                                  sx={{
                                    position: 'absolute',
                                    top: 4,
                                    right: 4,
                                    minWidth: 24,
                                    height: 24,
                                    p: 0,
                                    bgcolor: kept ? 'rgba(0,0,0,0.7)' : 'success.main',
                                    color: 'white',
                                    '&:hover': { bgcolor: kept ? 'rgba(0,0,0,0.85)' : 'success.dark' }
                                  }}
                                  title={kept ? 'Remove from product' : 'Keep photo'}
                                >
                                  {kept ? '×' : '↺'}
                                </Button>
                              )}
                              {selectionMode && (
                                <Box sx={{ position: 'absolute', top: 4, left: 4 }}>
                                  <Checkbox
                                    checked={selected}
                                    onChange={() => toggleSelected(p.public_id)}
                                    size="small"
                                    sx={{ p: 0, color: 'white', '&.Mui-checked': { color: 'primary.main' } }}
                                  />
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={<CloudUpload />}
                    >
                      Choose files
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        hidden
                        onChange={(e)=> handleFilesChange(e.target.files, setFieldValue)}
                      />
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      {newPreviews.length ? `${newPreviews.length} selected` : 'No new files selected'}
                    </Typography>
                  </Box>
                  {!!newPreviews.length && (
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 1.5 }}>
                        {newPreviews.map((p, idx) => (
                          <Box key={idx} sx={{ position: 'relative', height: 80, width: 80, borderRadius: 1, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
                            <Box component="img" src={p.url} alt={p.name} sx={{ height: '100%', width: '100%', objectFit: 'cover' }} />
                            <Button
                              size="small"
                              onClick={() => {
                                // Remove this newly selected file before submit
                                setNewPreviews(prev => prev.filter((_, i) => i !== idx));
                                // Update Formik 'photos' to match
                                setFieldValue('photos', (prev) => {
                                  const arr = Array.isArray(prev) ? prev.slice() : [];
                                  arr.splice(idx, 1);
                                  return arr;
                                });
                              }}
                              sx={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                minWidth: 24,
                                height: 24,
                                p: 0,
                                bgcolor: 'rgba(0,0,0,0.7)',
                                color: 'white',
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.85)' }
                              }}
                              title="Remove this image"
                            >
                              ×
                            </Button>
                          </Box>
                        ))}
                      </Box>
                      <Box sx={{ mt: 1.5 }}>
                        <Button size="small" color="error" variant="outlined" onClick={() => { setNewPreviews([]); setFieldValue('photos', []); }}>
                          Clear New Files
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>

                <Box sx={{ pt: 1 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting}
                    size="large"
                  >
                    {isSubmitting ? 'Saving…' : submitLabel}
                  </Button>
                </Box>

              </Box>
            </Form>
          )}
        </Formik>
      </CardContent>
    </Card>
  );
}
