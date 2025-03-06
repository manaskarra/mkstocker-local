import React, { useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Add } from '@mui/icons-material';
import StockList from '../components/StockList';
import StockForm from '../components/StockForm';
import { fetchStocks, addStock, updateStock, deleteStock } from '../services/api';

const Stocks = ({ currency, onCurrencyChange }) => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useEffect(() => {
    loadStocks();
  }, []);

  const loadStocks = async () => {
    setLoading(true);
    try {
      const data = await fetchStocks();
      setStocks(data.stocks || []);
    } catch (error) {
      console.error('Error loading stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setAddDialogOpen(true);
  };

  const handleAddClose = () => {
    setAddDialogOpen(false);
  };

  const handleAddSubmit = async (newStock) => {
    console.log('handleAddSubmit called with:', newStock);
    try {
      const result = await addStock(newStock);
      console.log('addStock result:', result);
      loadStocks(); // Reload stocks after adding
      setAddDialogOpen(false); // Close the dialog
    } catch (error) {
      console.error('Error adding stock:', error);
      alert(`Failed to add stock: ${error.message}`);
    }
  };

  const handleEditSubmit = async (id, updatedStock) => {
    try {
      await updateStock(id, updatedStock);
      loadStocks(); // Reload stocks after editing
    } catch (error) {
      console.error('Error updating stock:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteStock(id);
      loadStocks(); // Reload stocks after deleting
    } catch (error) {
      console.error('Error deleting stock:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Manage Stocks</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Add />}
          onClick={handleAddClick}
        >
          Add Stock
        </Button>
      </Box>

      {loading ? (
        <Typography>Loading stocks...</Typography>
      ) : (
        <StockList 
          stocks={stocks} 
          onEdit={handleEditSubmit} 
          onDelete={handleDelete}
          currency={currency}
          onCurrencyChange={onCurrencyChange}
        />
      )}

      <StockForm
        open={addDialogOpen}
        handleClose={handleAddClose}
        handleSubmit={handleAddSubmit}
      />
    </Box>
  );
};

export default Stocks;