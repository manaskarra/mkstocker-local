import React from 'react';
import { AppBar, Toolbar, Typography } from '@mui/material';

const Header = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: '0.05em' }}>
          MKStocker - Buy High Sell Low 💯💯💯
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default Header;