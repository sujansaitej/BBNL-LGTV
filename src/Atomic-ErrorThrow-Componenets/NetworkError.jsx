import { Box, Typography, Button, Paper } from '@mui/material';

const NetworkErrorNotification = ({ onRetry }) => {
 
  
  const PlaceholderImage = () => (
    <Box
      sx={{
        width: '100%',
        maxWidth: 360,
        height: 200,
        bgcolor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mb: 3,
        border: '2px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      <img 
        src={`${process.env.PUBLIC_URL}/error/networkerror.svg`} 
        alt="Network error"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          // Glassmorphism effect
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 4,
          
          // Layout
          maxWidth: 480,
          width: '100%',
          p: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          
          // Shadow for depth
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        }}
      >
        {/* Image Placeholder - Replace with your local SVG */}
        <PlaceholderImage />
        
        {/* Error Title */}
        <Typography
          variant="h4"
          component="h1"
          sx={{
            color: '#ffffff',
            fontWeight: 600,
            mb: 1.5,
            textAlign: 'center',
            letterSpacing: '-0.5px',
          }}
        >
          No Internet Connection
        </Typography>
        
        {/* Error Description */}
        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255, 255, 255, 0.8)',
            textAlign: 'center',
            mb: 4,
            fontSize: '0.95rem',
          }}
        >
          Please check your network and try again
        </Typography>
        
        {/* Retry Button */}
        <Button
          variant="contained"
          size="large"
          onClick={onRetry}
          sx={{
            bgcolor: '#FDB44B',
            color: '#1a1a1a',
            fontWeight: 600,
            px: 5,
            py: 1.5,
            borderRadius: 3,
            textTransform: 'none',
            fontSize: '1rem',
            boxShadow: '0 4px 15px 0 rgba(253, 180, 75, 0.4)',
            transition: 'all 0.3s ease',
            
            '&:hover': {
              bgcolor: '#FDC468',
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 20px 0 rgba(253, 180, 75, 0.5)',
            },
            
            '&:active': {
              transform: 'translateY(0)',
            },
          }}
        >
          Try Again
        </Button>
      </Paper>
    </Box>
  );
};
 export default NetworkErrorNotification
  