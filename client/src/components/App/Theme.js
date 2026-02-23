import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#5D6C5C', // Ebony (Primary brand color)
      contrastText: '#FDFDF6', // Porcelain 
    },
    secondary: {
      main: '#17292B', // Jet Black (Sidebars and dark headers)
      contrastText: '#FDFDF6',
    },
    background: {
      default: '#FDFDF6', // Porcelain 
      paper: '#FFFFFF',   // Pure white for cards
    },
    text: {
      primary: '#17292B',   // Jet Black
      secondary: '#686967', // Dim Grey 
    },
    divider: '#D6DFE2', // Alabaster Grey (Lines between posts/sections)
  },
  typography: {
    // Academic fonts often look great with a Serif/Sans-Serif mix
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { 
      fontWeight: 700, 
      fontSize: '2.5rem', 
      lineHeight: 1.2, 
      color: '#17292B' 
    },
    h2: { 
      fontWeight: 600, 
      fontSize: '2rem', 
      lineHeight: 1.3, 
      color: '#5D6C5C' // Using the Ebony for sub-headers
    },
    body1: { 
      fontSize: '1rem',
      letterSpacing: '0.01em'
    },
    button: { 
      textTransform: 'none', 
      fontWeight: 600 
    }, 
  },
  shape: {
    borderRadius: 8, 
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 8px rgba(0,0,0,0.05)', 
          border: '1px solid #D6DFE2',
        },
      },
    },
  },
});

export default theme;
