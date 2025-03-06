import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Menu,
  ListItemIcon,
  ListItemText,
  ListItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Collapse,
} from '@mui/material';
import { Edit, Delete, Add, ArrowUpward, ArrowDownward, MoreVert, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import StockForm from './StockForm';

// The password to protect admin actions
const ADMIN_PASSWORD = "mx"; // Change this to your desired password

const StockList = ({ 
  stocks = [], 
  onEdit, 
  onDelete, 
  onAdd, 
  currency, 
  onCurrencyChange, 
  fixedOrderTickers = ['SPLG', 'QQQM', 'BTC-USD', 'XRP-USD'] 
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [currentStock, setCurrentStock] = useState(null);
  const [currentTicker, setCurrentTicker] = useState(null);
  const [tickerSummaries, setTickerSummaries] = useState([]);
  const [reorderMenuAnchor, setReorderMenuAnchor] = useState(null);
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [isReordering, setIsReordering] = useState(false);
  const [expandedTickers, setExpandedTickers] = useState({});
  
  // Add states for password protection
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Format currency for display
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Toggle expanded state for a ticker
  const toggleExpandTicker = (ticker) => {
    setExpandedTickers(prev => ({
      ...prev,
      [ticker]: !prev[ticker]
    }));
  };

  // Process stocks data when it changes
  useEffect(() => {
    console.log("Processing stocks:", stocks.map(s => s.ticker));
    
    // Group stocks by ticker
    const stocksByTicker = stocks.reduce((acc, stock) => {
      if (!acc[stock.ticker]) {
        acc[stock.ticker] = [];
      }
      acc[stock.ticker].push(stock);
      return acc;
    }, {});

    // Calculate summary for each ticker
    const summaries = Object.keys(stocksByTicker).map(ticker => {
      const tickerStocks = stocksByTicker[ticker];
      
      // Sort stocks by date in descending order (newest first)
      tickerStocks.sort((a, b) => {
        return new Date(b.buy_date) - new Date(a.buy_date);
      });
      
      const totalQuantity = tickerStocks.reduce((sum, stock) => sum + (stock.quantity || 0), 0);
      const totalInvestment = tickerStocks.reduce((sum, stock) => sum + ((stock.buy_price || 0) * (stock.quantity || 0)), 0);
      const totalCurrentValue = tickerStocks.reduce((sum, stock) => sum + ((stock.current_price || 0) * (stock.quantity || 0)), 0);
      const totalProfitLoss = totalCurrentValue - totalInvestment;
      const profitLossPercent = totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0;

      return {
        ticker,
        stocks: tickerStocks, // These are now sorted by date descending
        totalQuantity,
        totalInvestment,
        totalCurrentValue,
        totalProfitLoss,
        profitLossPercent,
        order: tickerStocks[0]?.order || 999 // Use order from first stock or default to high number
      };
    });

    // Sort summaries based on fixed order first, then by order field
    summaries.sort((a, b) => {
      const aIndex = fixedOrderTickers.indexOf(a.ticker);
      const bIndex = fixedOrderTickers.indexOf(b.ticker);
      
      if (aIndex !== -1 && bIndex !== -1) {
        // Both are in fixed order, sort by their position
        return aIndex - bIndex;
      } else if (aIndex !== -1) {
        // Only a is in fixed order, it comes first
        return -1;
      } else if (bIndex !== -1) {
        // Only b is in fixed order, it comes first
        return 1;
      } else {
        // Neither are in fixed order, sort by order field
        return a.order - b.order;
      }
    });
    
    console.log("Sorted ticker summaries:", summaries.map(s => s.ticker));
    setTickerSummaries(summaries);
  }, [stocks, fixedOrderTickers]);

  // Password verification function
  const verifyPassword = async () => {
    if (password === ADMIN_PASSWORD) {
      setPasswordError(false);
      setPasswordDialogOpen(false);
      
      // Execute the pending action
      if (pendingAction) {
        const { type, payload } = pendingAction;
        
        try {
          switch (type) {
            case 'add':
              setCurrentTicker(payload);
              setAddDialogOpen(true);
              break;
            case 'edit':
              setCurrentStock(payload);
              setEditDialogOpen(true);
              break;
            case 'delete':
              if (onDelete) {
                await onDelete(payload);
              }
              break;
            default:
              break;
          }
        } catch (error) {
          console.error('Error executing action:', error);
          alert('An error occurred. Please try again.');
        }
        
        // Reset password and pending action
        setPassword("");
        setPendingAction(null);
      }
    } else {
      setPasswordError(true);
    }
  };

  // Handle password dialog close
  const handlePasswordDialogClose = () => {
    setPasswordDialogOpen(false);
    setPassword("");
    setPasswordError(false);
    setPendingAction(null);
  };

  // Secure action handler
  const secureAction = (type, payload) => {
    setPendingAction({ type, payload });
    setPasswordDialogOpen(true);
  };

  const handleEditClick = (stock) => {
    console.log('Opening edit form for stock:', stock);
    secureAction('edit', {
      ...stock,
      // Make sure all required fields are present
      id: stock.id,
      ticker: stock.ticker,
      quantity: stock.quantity,
      buy_price: stock.buy_price,
      buy_date: stock.buy_date,
    });
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setCurrentStock(null);
  };

  const handleEditSubmit = async (updatedStock) => {
    try {
      if (onEdit) {
        await onEdit(updatedStock);
      }
      setEditDialogOpen(false);
      setCurrentStock(null);
    } catch (error) {
      console.error('Error updating stock:', error);
    }
  };

  const handleDeleteClick = (stockId) => {
    secureAction('delete', stockId);
  };

  const handleAddClick = (ticker = '') => {
    secureAction('add', ticker);
  };

  const handleAddClose = () => {
    setAddDialogOpen(false);
    setCurrentTicker(null);
  };

  const handleAddSubmit = async (newStock) => {
    try {
      if (onAdd) {
        await onAdd(newStock);
      }
      setAddDialogOpen(false);
      setCurrentTicker(null);
    } catch (error) {
      console.error('Error adding stock:', error);
    }
  };

  const handleReorderClick = (event, ticker) => {
    setReorderMenuAnchor(event.currentTarget);
    setSelectedTicker(ticker);
  };

  const handleReorderClose = () => {
    setReorderMenuAnchor(null);
    setSelectedTicker(null);
  };

  const handleMoveUp = () => {
    // Implement move up logic
    handleReorderClose();
  };

  const handleMoveDown = () => {
    // Implement move down logic
    handleReorderClose();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Your Stocks</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
            <InputLabel id="currency-select-label">Currency</InputLabel>
            <Select
              labelId="currency-select-label"
              id="currency-select"
              value={currency}
              label="Currency"
              onChange={onCurrencyChange}
            >
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="AED">AED</MenuItem>
              <MenuItem value="INR">INR</MenuItem>
            </Select>
          </FormControl>
          <Button 
            variant="contained" 
            startIcon={<Add />} 
            onClick={() => handleAddClick()}
          >
            Add Stock
          </Button>
        </Box>
      </Box>

      {tickerSummaries.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">No stocks in your portfolio. Add some to get started!</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox"></TableCell>
                <TableCell>Ticker</TableCell>
                <TableCell align="right">Current Value</TableCell>
                <TableCell>Profit/Loss</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tickerSummaries.map((summary) => (
                <React.Fragment key={summary.ticker}>
                  <TableRow 
                    hover
                    onClick={() => toggleExpandTicker(summary.ticker)}
                    sx={{ cursor: 'pointer', '& > *': { borderBottom: 'unset' } }}
                  >
                    <TableCell padding="checkbox">
                      <IconButton size="small">
                        {expandedTickers[summary.ticker] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={summary.ticker} 
                        color="primary" 
                        sx={{ fontSize: '1rem', height: 'auto', py: 0.5 }}
                      />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(summary.totalCurrentValue)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography 
                          variant="body1" 
                          fontWeight="medium"
                          color={summary.totalProfitLoss >= 0 ? 'success.main' : 'error.main'}
                        >
                          {formatCurrency(summary.totalProfitLoss)}
                        </Typography>
                        <Chip 
                          size="small"
                          label={`${summary.profitLossPercent >= 0 ? '+' : ''}${summary.profitLossPercent.toFixed(2)}%`}
                          color={summary.profitLossPercent >= 0 ? 'success' : 'error'}
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddClick(summary.ticker);
                        }}
                      >
                        <Add />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  
                  {/* Collapsible transactions section */}
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                      <Collapse in={expandedTickers[summary.ticker]} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                          <Typography variant="h6" gutterBottom component="div">
                            Transactions
                          </Typography>
                          <Table size="small" aria-label="transactions">
                            <TableHead>
                              <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell align="right">Quantity</TableCell>
                                <TableCell align="right">Buy Price</TableCell>
                                <TableCell align="right">Current Price</TableCell>
                                <TableCell align="center">Current Value</TableCell>
                                <TableCell>Profit/Loss</TableCell>
                                <TableCell align="right">Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {summary.stocks.map((stock) => (
                                <TableRow key={stock.id}>
                                  <TableCell>{stock.buy_date}</TableCell>
                                  <TableCell align="right">{stock.quantity}</TableCell>
                                  <TableCell align="right">{formatCurrency(stock.buy_price)}</TableCell>
                                  <TableCell align="right"><strong>{formatCurrency(stock.current_price)}</strong></TableCell>
                                  <TableCell align="center">{formatCurrency(stock.current_value)}</TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Typography 
                                        variant="body2"
                                        color={stock.profit_loss >= 0 ? 'success.main' : 'error.main'}
                                      >
                                        {formatCurrency(stock.profit_loss)}
                                      </Typography>
                                      <Typography 
                                        variant="caption"
                                        color={stock.profit_loss >= 0 ? 'success.main' : 'error.main'}
                                        sx={{ ml: 1 }}
                                      >
                                        ({((stock.profit_loss / (stock.buy_price * stock.quantity)) * 100).toFixed(2)}%)
                                      </Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell align="right">
                                    <IconButton 
                                      size="small" 
                                      color="primary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditClick(stock);
                                      }}
                                    >
                                      <Edit />
                                    </IconButton>
                                    <IconButton 
                                      size="small" 
                                      color="error"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(stock.id);
                                      }}
                                    >
                                      <Delete />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Reorder Menu */}
      <Menu
        anchorEl={reorderMenuAnchor}
        open={Boolean(reorderMenuAnchor)}
        onClose={handleReorderClose}
      >
        <ListItem button onClick={handleMoveUp}>
          <ListItemIcon>
            <ArrowUpward fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Move Up" />
        </ListItem>
        <ListItem button onClick={handleMoveDown}>
          <ListItemIcon>
            <ArrowDownward fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Move Down" />
        </ListItem>
      </Menu>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={handlePasswordDialogClose}>
        <DialogTitle>Admin Authentication</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Please enter the admin password to continue:
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            id="password"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={passwordError}
            helperText={passwordError ? "Incorrect password" : ""}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                verifyPassword();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePasswordDialogClose}>Cancel</Button>
          <Button onClick={verifyPassword} variant="contained" color="primary">
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {currentStock && (
        <StockForm
          open={editDialogOpen}
          handleClose={handleEditClose}
          handleSubmit={handleEditSubmit}
          initialValues={currentStock}
        />
      )}

      {addDialogOpen && (
        <StockForm
          open={addDialogOpen}
          handleClose={handleAddClose}
          handleSubmit={handleAddSubmit}
          initialValues={{
            ticker: currentTicker,
            quantity: 0,
            buy_price: 0,
            buy_date: new Date().toISOString().split('T')[0],
            currency: currency
          }}
        />
      )}
    </Box>
  );
};

export default StockList;