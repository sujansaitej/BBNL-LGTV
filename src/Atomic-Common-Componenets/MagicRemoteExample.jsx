// Example: How to integrate Magic Remote in LiveChannels or any component

import { useEnhancedRemoteNavigation, useMagicRemote } from '../Atomic-Common-Componenets/useMagicRemote';

// Example 1: Simple Magic Remote coordinate tracking
function MyComponent() {
  const { coordinates, isReady, resetQuaternion } = useMagicRemote({
    enabled: true,
    sensorType: 'coordinate',
    interval: 50, // 20 FPS
    onCoordinateChange: (coords) => {
      console.log('Pointer at:', coords.x, coords.y);
    },
  });

  return (
    <div>
      {isReady && (
        <div style={{ position: 'fixed', top: coordinates.y, left: coordinates.x }}>
          🎯 {/* Custom cursor */}
        </div>
      )}
      <button onClick={resetQuaternion}>Reset Remote</button>
    </div>
  );
}

// Example 2: Enhanced navigation for channel grid WITH NUMBER JUMP
function ChannelGrid({ channels, onChannelSelect }) {
  const { 
    focusedIndex, 
    getItemProps, 
    magicRemoteReady,
    channelJumpBuffer, // For displaying HUD
  } = useEnhancedRemoteNavigation(
    channels, // Pass full array for number jump
    {
      orientation: 'grid',
      columns: 5,
      useMagicRemotePointer: true, // Enable Magic Remote pointer
      focusThreshold: 100, // Pixel distance to trigger focus
      enableNumberJump: true, // Enable number key jump
      numberJumpTimeout: 1000, // 1 second timeout
      numberJumpField: 'channelno', // Field to match in channel objects
      onSelect: (index) => {
        console.log('Selected channel:', channels[index]);
        // Call your channel selection handler
        onChannelSelect?.(channels[index]);
      },
    }
  );

  return (
    <div>
      {/* Channel Jump HUD */}
      {channelJumpBuffer && (
        <div
          style={{
            position: 'fixed',
            top: '2rem',
            right: '2rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            padding: '1rem 2rem',
            borderRadius: '12px',
            fontSize: '1.75rem',
            fontWeight: 700,
            boxShadow: '0 10px 40px rgba(102, 126, 234, 0.6)',
            zIndex: 100,
            animation: 'pulse 0.6s ease infinite',
          }}
        >
          Channel: {channelJumpBuffer}
        </div>
      )}

      {/* Magic Remote Status */}
      {magicRemoteReady && (
        <div style={{ position: 'fixed', top: 10, right: 10, color: '#0f0', fontSize: '14px' }}>
          🎮 Magic Remote Active
        </div>
      )}

      {/* Channel Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
        {channels.map((channel, index) => (
          <div
            key={index}
            {...getItemProps(index)}
            style={{
              padding: '20px',
              border: '2px solid transparent',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)',
              outline: 'none',
              transition: 'all 0.15s ease',
              cursor: 'pointer',
            }}
            className={focusedIndex === index ? 'focused' : ''}
          >
            <img 
              src={channel.chlogo || channel.logo} 
              alt={channel.chtitle || channel.name}
              style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
            />
            <p style={{ margin: '8px 0 0', fontSize: '14px', fontWeight: 600 }}>
              {channel.chtitle || channel.name}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#888' }}>
              Ch {channel.channelno}
            </p>
          </div>
        ))}
      </div>

      {/* CSS for smooth animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }

        .focused {
          border: 3px solid #667eea !important;
          transform: scale(1.08);
          box-shadow: 0 0 30px rgba(102, 126, 234, 0.6);
          background: rgba(102, 126, 234, 0.15) !important;
        }

        [data-hovered="true"]:not(.focused) {
          border: 2px solid #667eea !important;
          transform: scale(1.03);
        }
      `}</style>
    </div>
  );
}

// Example 3: Full sensor data (gyroscope, accelerometer, etc.)
function MotionGame() {
  const { sensorData, isReady, resetQuaternion } = useMagicRemote({
    enabled: true,
    sensorType: 'all', // Get all sensor data
    interval: 16, // 60 FPS for gaming
    onSensorData: (data) => {
      // Use gyroscope for rotation
      if (data.gyroscope) {
        console.log('Gyro:', data.gyroscope.x, data.gyroscope.y, data.gyroscope.z);
      }
      
      // Use accelerometer for movement
      if (data.acceleration) {
        console.log('Accel:', data.acceleration.x, data.acceleration.y);
      }
      
      // Use quaternion for 3D rotation
      if (data.gameRotationVector) {
        console.log('Rotation:', data.gameRotationVector.euler);
      }
    },
  });

  return (
    <div>
      <h2>Motion-Controlled Game</h2>
      <button onClick={resetQuaternion}>Reset Sensor</button>
      {isReady && sensorData && (
        <pre>{JSON.stringify(sensorData, null, 2)}</pre>
      )}
    </div>
  );
}

export { MyComponent, ChannelGrid, MotionGame };
