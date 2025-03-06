import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment
} from '@mui/material';

const StockForm = ({ open, handleClose, handleSubmit, initialValues }) => {
  const [formData, setFormData] = useState({
    id: '',
    ticker: '',
    quantity: 0,
    buy_price: 0,
    buy_date: new Date().toISOString().split('T')[0],
    currency: 'USD'
  });

  // Update form data when initialValues changes
  useEffect(() => {
    if (initialValues) {
      setFormData({
        id: initialValues.id || '',
        ticker: initialValues.ticker || '',
        quantity: initialValues.quantity || 0,
        buy_price: initialValues.buy_price || 0,
        buy_date: initialValues.buy_date || new Date().toISOString().split('T')[0],
        currency: initialValues.currency || 'USD'
      });
    }
  }, [initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'buy_price' ? parseFloat(value) || 0 : value
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{initialValues.id ? 'Edit Stock' : 'Add Stock'}</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleFormSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Ticker Symbol"
            name="ticker"
            value={formData.ticker}
            onChange={handleChange}
            autoFocus
            disabled={!!initialValues.id} // Disable ticker editing for existing stocks
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            label="Quantity"
            name="quantity"
            type="number"
            value={formData.quantity}
            onChange={handleChange}
            inputProps={{ min: 0, step: 0.01 }}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            label="Buy Price"
            name="buy_price"
            type="number"
            value={formData.buy_price}
            onChange={handleChange}
            InputProps={{
              startAdornment: <InputAdornment position="start">{formData.currency}</InputAdornment>,
              inputProps: { min: 0, step: 0.01 }
            }}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            label="Buy Date"
            name="buy_date"
            type="date"
            value={formData.buy_date}
            onChange={handleChange}
            InputLabelProps={{
              shrink: true,
            }}
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Currency</InputLabel>
            <Select
              value={formData.currency || 'USD'}
              onChange={handleChange}
              name="currency"
              label="Currency"
            >
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="AED">AED</MenuItem>
              <MenuItem value="INR">INR</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleFormSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default StockForm;