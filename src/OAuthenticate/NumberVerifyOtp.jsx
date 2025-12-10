import React, { useState, useEffect } from 'react';

const PhoneAuthApp = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [focusedElement, setFocusedElement] = useState('input');
  const [isCountryCodeOpen, setIsCountryCodeOpen] = useState(false);

  const countryCodes = ['+91', '+1', '+44', '+s86', '+81', '+61', '+49', '+33'];

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.keyCode || e.which;

      if (key === 461 || key === 27) {
        e.preventDefault();
        if (isCountryCodeOpen) {
          setIsCountryCodeOpen(false);
        } else if (phoneNumber.length > 0) {
          setPhoneNumber(phoneNumber.slice(0, -1));
        }
        return;
      }

      if (key === 13) {
        e.preventDefault();
        if (focusedElement === 'countryCode') {
          setIsCountryCodeOpen(!isCountryCodeOpen);
        } else if (focusedElement === 'button' && phoneNumber.length === 10) {
          handleGetOTP();
        }
        return;
      }

      if (key === 38) {
        e.preventDefault();
        if (isCountryCodeOpen) {
          const currentIndex = countryCodes.indexOf(countryCode);
          if (currentIndex > 0) {
            setCountryCode(countryCodes[currentIndex - 1]);
          }
        } else if (focusedElement === 'button') {
          setFocusedElement('input');
        }
        return;
      }

      if (key === 40) {
        e.preventDefault();
        if (isCountryCodeOpen) {
          const currentIndex = countryCodes.indexOf(countryCode);
          if (currentIndex < countryCodes.length - 1) {
            setCountryCode(countryCodes[currentIndex + 1]);
          }
        } else if (focusedElement === 'input' && phoneNumber.length === 10) {
          setFocusedElement('button');
        }
        return;
      }

      if (key === 37) {
        e.preventDefault();
        if (focusedElement === 'input') {
          setFocusedElement('countryCode');
        }
        return;
      }

      if (key === 39) {
        e.preventDefault();
        if (focusedElement === 'countryCode') {
          setFocusedElement('input');
        }
        return;
      }

      if (key >= 48 && key <= 57 && focusedElement === 'input') {
        e.preventDefault();
        const digit = String.fromCharCode(key);
        if (phoneNumber.length < 10) {
          setPhoneNumber(phoneNumber + digit);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phoneNumber, focusedElement, countryCode, isCountryCodeOpen]);

  const handleGetOTP = () => {
    if (phoneNumber.length === 10) {
      alert(`Sending OTP to ${countryCode} ${phoneNumber}`);
    }
  };

  const isButtonEnabled = phoneNumber.length === 10;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box',
      fontFamily: 'Arial, Helvetica, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#111827',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        border: '2px solid',
        boxShadow: '0 20px 40px rgba(59, 130, 246, 0.3)'
      }}>
        
        {/* Title */}
        <h1 style={{
          fontSize: '40px',
          fontWeight: 'bold',
          color: '#ffffff',
          textAlign: 'center',
          margin: '0 0 10px 0'
        }}>
          Welcome Back
        </h1>
        
        {/* Subtitle */}
        <p style={{
          color: '#9ca3af',
          textAlign: 'center',
          fontSize: '18px',
          margin: '0 0 40px 0'
        }}>
          Sign in to continue to your profile
        </p>

        {/* Step Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '40px',
          gap: '15px'
        }}>
          {/* Step 1 - Phone */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              📱
            </div>
            <span style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600' }}>
              Phone
            </span>
          </div>
          {/* Divider */}
          <div style={{
            width: '80px',
            height: '3px',
            backgroundColor: '#374151',
            borderRadius: '2px'
          }}></div>
          
          {/* Step 2 - Verify */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.5 }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              ✓
            </div>
            <span style={{ color: '#9ca3af', fontSize: '16px', fontWeight: '600' }}>
              Verify
            </span>
          </div>
        </div>

        {/* Label */}
        <label style={{
          display: 'block',
          color: '#ffffff',
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '12px'
        }}>
          Phone Number
        </label>

        {/* Input Group */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px'
        }}>
          {/* Country Code */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsCountryCodeOpen(!isCountryCodeOpen)}
              style={{
                height: '60px',
                padding: '0 20px',
                borderRadius: '30px',
                backgroundColor: focusedElement === 'countryCode' ? '#374151' : '#1f2937',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: '600',
                border: focusedElement === 'countryCode' ? '3px solid #3b82f6' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{countryCode}</span>
              <span style={{ fontSize: '12px' }}>▼</span>
            </button>

            {/* Dropdown */}
            {isCountryCodeOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                marginTop: '8px',
                left: 0,
                backgroundColor: '#1f2937',
                borderRadius: '16px',
                padding: '8px',
                zIndex: 10,
                minWidth: '100px',
                border: '2px solid #3b82f6',
                boxShadow: '0 10px 20px rgba(0, 0, 0, 0.5)'
              }}>
                {countryCodes.map((code) => (
                  <div
                    key={code}
                    onClick={() => {
                      setCountryCode(code);
                      setIsCountryCodeOpen(false);
                    }}
                    style={{
                      padding: '10px 15px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      color: '#ffffff',
                      fontSize: '16px',
                      backgroundColor: code === countryCode ? '#2563eb' : 'transparent'
                    }}
                  >
                    {code}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Phone Input */}
          <div style={{
            flex: 1,
            height: '60px',
            padding: '0 20px',
            borderRadius: '30px',
            backgroundColor: focusedElement === 'input' ? '#374151' : '#1f2937',
            border: focusedElement === 'input' ? '3px solid #3b82f6' : 'none',
            display: 'flex',
            alignItems: 'center'
          }}>
            <input
              type="text"
              value={phoneNumber}
              readOnly
              placeholder="Enter 10 Digit Number"
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                color: '#ffffff',
                fontSize: '16px',
                border: 'none',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Character Count */}
        <div style={{
          textAlign: 'right',
          color: '#6b7280',
          fontSize: '14px',
          marginBottom: '20px'
        }}>
          {phoneNumber.length}/10
        </div>

        {/* Get OTP Button */}
        <button
          onClick={handleGetOTP}
          disabled={!isButtonEnabled}
          style={{
            width: '100%',
            height: '60px',
            borderRadius: '30px',
            fontWeight: '600',
            fontSize: '16px',
            border: focusedElement === 'button' && isButtonEnabled ? '3px solid #3b82f6' : 'none',
            cursor: isButtonEnabled ? 'pointer' : 'not-allowed',
            backgroundColor: isButtonEnabled ? (focusedElement === 'button' ? '#1d4ed8' : '#2563eb') : '#374151',
            color: isButtonEnabled ? '#ffffff' : '#6b7280',
            boxShadow: isButtonEnabled ? '0 10px 20px rgba(59, 130, 246, 0.3)' : 'none'
          }}
        >
          Get OTP
        </button>
      </div>
    </div>
  );
};

export default PhoneAuthApp;