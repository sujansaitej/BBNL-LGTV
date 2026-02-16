import React from 'react';

export default function InvalidMobileNotification() {
  const handleTryAgain = () => {
    console.log('Try Again clicked');
    // Add your retry logic here
  };

  const handleContactSupport = () => {
    console.log('Contact Support clicked');
    // Add your support contact logic here
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-3xl shadow-2xl p-8 max-w-md w-full border border-gray-800">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center shadow-lg shadow-red-900/50">
              <svg 
                className="w-10 h-10 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={3} 
                  d="M12 8v4m0 4h.01"
                />
              </svg>
            </div>
            {/* Glow effect */}
            <div className="absolute inset-0 w-20 h-20 bg-red-600 rounded-full blur-xl opacity-40 -z-10"></div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-white text-3xl font-bold text-center mb-4">
          Invalid mobile number
        </h2>

        {/* Description */}
        <p className="text-gray-400 text-center mb-8 text-base leading-relaxed">
          The mobile number you entered is incorrect. Please check the number and try again
        </p>

        {/* Try Again Button */}
        <button
          onClick={handleTryAgain}
          className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-gray-900 font-semibold py-3.5 px-6 rounded-full transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg mb-4"
        >
          Try Again
        </button>

        {/* Contact Support Link */}
        <button
          onClick={handleContactSupport}
          className="w-full text-yellow-500 hover:text-yellow-400 font-medium py-2 transition-colors duration-200 underline underline-offset-4"
        >
          Contact Support
        </button>
      </div>
    </div>
  );
}