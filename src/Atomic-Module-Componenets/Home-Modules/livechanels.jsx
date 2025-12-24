import React from "react";
const liveChannelsData = [
  {
    id: 1,
    name: 'Udhaya TV',
    category: 'Live Channels'
  },
  {
    id: 2,
    name: 'Colors Super TV',
    category: 'Live Channels'
  },
  {
    id: 3,
    name: 'Zee-kanada',
    category: 'Live Channels'
  },
  {
    id: 4,
    name: 'Gemini TV',
    category: 'Live Channels'
  },
  {
    id: 5,
    name: 'View All Channels',
    category: 'Live Channels',
    isViewAll: true
  }
];
const LiveChannels = ({ selectedIndex, onSelect }) => {
  return (
    <div style={{ marginBottom: '48px' }}>
      <h2 style={{
        fontSize: '26px',
        fontWeight: '600',
        marginBottom: '18px',
        letterSpacing: '-0.5px',
        color: 'white'
      }}>
        Live TV Channels
      </h2>

      <div style={{
        display: 'flex',
        gap: '24px',
        overflowX: 'auto',
        padding: '8px 2px',
        scrollSnapType: 'x mandatory'
      }}>
        {liveChannelsData.map((channel, index) => {
          const isSelected = selectedIndex === index;
          
          return (
            <div
              key={channel.id}
              onClick={() => onSelect(index)}
              style={{
                minWidth: '200px',
                width: '200px',
                height: '174px',
                borderRadius: '16px',
                overflow: 'hidden',
                backgroundColor: channel.isViewAll ? '#1a1a1a' : '#0a0a0a',
                border: isSelected ? '2px solid #4bd2ff' : '1px solid #262626',
                transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                cursor: 'pointer',
                boxShadow: isSelected ? '0 10px 26px rgba(75, 210, 255, 0.25)' : '0 6px 18px rgba(0,0,0,0.35)',
                scrollSnapAlign: 'start'
              }}
            >
              <div style={{
                height: '110px',
                backgroundColor: channel.isViewAll ? '#1a1a1a' : '#0a0a0a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
              }}>
                {channel.isViewAll ? (
                  <div style={{ textAlign: 'center', color: 'white' }}>
                    <div style={{ fontSize: '30px', marginBottom: '6px' }}>→</div>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>View All</div>
                  </div>
                ) : (
                  <div style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px',
                    fontWeight: '700',
                    color: 'white',
                    textTransform: 'uppercase'
                  }}>
                    {channel.name.substring(0, 3)}
                  </div>
                )}
              </div>
              <div style={{ padding: '12px', backgroundColor: '#0a0a0a', height: '64px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'white'
                }}>
                  {channel.name}
                </div>
                <div style={{ fontSize: '12px', color: '#888888' }}>
                  {channel.category}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveChannels;