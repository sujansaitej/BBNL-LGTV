import React from 'react';



const ottAppsData = [
  {
    id: 1,
    name: 'JioHotstar',
    logo: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop',
    category: 'Streaming Services',
    deeplink: '#jiohotstar',
    bgGradient: 'linear-gradient(135deg, #4c4cff 0%, #8b5cf6 100%)'
  },
  {
    id: 2,
    name: 'Prime Video',
    logo: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400&h=300&fit=crop',
    category: 'Streaming Services',
    deeplink: '#primevideo',
    bgGradient: 'linear-gradient(135deg, #00a8e1 0%, #0080b3 100%)'
  },
  {
    id: 3,
    name: 'Netflix',
    logo: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400&h=300&fit=crop',
    category: 'Streaming Services',
    deeplink: '#netflix',
    bgGradient: 'linear-gradient(135deg, #e50914 0%, #b20710 100%)'
  },
  {
    id: 4,
    name: 'Apple TV',
    logo: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=400&h=300&fit=crop',
    category: 'Streaming Services',
    deeplink: '#appletv',
    bgGradient: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)'
  },
  {
    id: 5,
    name: 'View All Ott',
    logo: null,
    category: 'Streaming Services',
    deeplink: '#viewall',
    isViewAll: true
  }
];

const OttApps = ({ selectedIndex, onSelect }) => {
  return (
    <div style={{ marginBottom: '60px' }}>
      <h2 style={{
        fontSize: '28px',
        fontWeight: '600',
        marginBottom: '24px',
        letterSpacing: '-0.5px',
        color: 'white'
      }}>
        Your OTT Apps
      </h2>

      <div style={{
        display: 'flex',
        gap: '20px',
        overflowX: 'auto',
        paddingBottom: '8px'
      }}>
        {ottAppsData.map((app, index) => {
          const isSelected = selectedIndex === index;
          
          return (
            <div
              key={app.id}
              onClick={() => onSelect(index)}
              style={{
                minWidth: '160px',
                width: '160px',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: app.isViewAll ? '#1a1a1a' : '#0a0a0a',
                border: isSelected ? '3px solid #ffffff' : '1px solid #2a2a2a',
                transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                boxShadow: isSelected ? '0 8px 24px rgba(255, 255, 255, 0.2)' : 'none'
              }}
            >
              <div style={{
                height: '120px',
                background: app.isViewAll ? '#1a1a1a' : app.bgGradient || '#2a2a2a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {app.isViewAll ? (
                  <div style={{ textAlign: 'center', color: 'white' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>→</div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>View All Ott</div>
                  </div>
                ) : (
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: 'white',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                  }}>
                    {app.name.split(' ')[0]}
                  </div>
                )}
              </div>
              <div style={{ padding: '12px', backgroundColor: '#0a0a0a' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'white'
                }}>
                  {app.name}
                </div>
                <div style={{ fontSize: '12px', color: '#888888' }}>
                  {app.category}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OttApps;
