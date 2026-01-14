# LG BBNL IPTV Application

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![React](https://img.shields.io/badge/React-19.2.1-61dafb.svg)
![LG webOS](https://img.shields.io/badge/LG-webOS-purple.svg)
![License](https://img.shields.io/badge/license-Private-red.svg)

A modern IPTV application built for LG webOS smart TVs, providing live TV streaming, OTT content, and personalized viewing experience.

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Development](#development)
  - [Build](#build)
- [Deployment](#deployment)
- [Architecture](#architecture)
- [API Integration](#api-integration)
- [Remote Control Navigation](#remote-control-navigation)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The LG BBNL IPTV Application is a comprehensive streaming solution designed specifically for LG webOS smart TVs. It provides users with access to live television channels, OTT applications, personalized favorites, and advanced content discovery features. Built with React and optimized for TV navigation using remote controls.

**Application ID:** `com.lg.bbnl`  
**Version:** 2.0.0  
**Vendor:** LG-BBNL

---

## ✨ Features

### Core Features
- 📺 **Live TV Streaming** - Watch live television channels with high-quality streaming
- 🎬 **OTT Integration** - Access popular OTT applications and content
- ⭐ **Favorites Management** - Save and organize favorite channels and content
- 🏠 **Smart Home Screen** - Personalized home screen with quick access to content
- 🔐 **OTP Authentication** - Secure login with phone number and OTP verification
- 📱 **Subscription Management** - Manage active subscriptions and packages
- 🎨 **Theme Customization** - Light/Dark theme support for comfortable viewing
- 🔔 **Notifications** - Stay updated with important alerts and messages

### Technical Features
- 🎮 **Remote Control Navigation** - Optimized for LG TV remote control
- 🌐 **Network Monitoring** - Real-time network connectivity detection
- 🎥 **Video.js Player** - Advanced video playback with customizable controls
- 📊 **State Management** - Efficient global state using RxJS
- ♿ **Error Handling** - Comprehensive error handling and user feedback
- 🚀 **Performance Optimized** - Fast loading and smooth transitions

---

## 🛠️ Technology Stack

### Frontend Framework
- **React** (v19.2.1) - UI library for building interactive interfaces
- **React Router DOM** (v7.11.0) - Client-side routing
- **React Scripts** (v5.0.1) - Build tooling and development server

### UI Libraries
- **Material-UI** (v7.3.6) - Component library with `@mui/material` and `@mui/icons-material`
- **Emotion** - CSS-in-JS styling solution
- **Tailwind CSS** (v4.1.17) - Utility-first CSS framework
- **Lucide React** - Modern icon library

### Media & Streaming
- **Video.js** (v8.23.4) - HTML5 video player
- **Swiper** (v12.0.3) - Modern mobile touch slider

### State Management & Data
- **RxJS** (v7.8.2) - Reactive programming with observables
- **Axios** (v1.13.2) - HTTP client for API requests

### Development Tools
- **PostCSS** - CSS transformation tool
- **Autoprefixer** - CSS vendor prefixing
- **Jest & Testing Library** - Unit and integration testing

### Target Platform
- **LG webOS TV** - Optimized for webOS smart TV platform
- **Chrome 53+** - Browser compatibility target

---

## 📁 Project Structure

```
lg-iptv-app/
├── public/                          # Static assets
│   ├── appinfo.json                # webOS app configuration
│   ├── index.html                  # HTML template
│   ├── manifest.json               # Web app manifest
│   └── error/                      # Error page assets
│
├── src/
│   ├── App.js                      # Main application component
│   ├── index.js                    # Application entry point
│   │
│   ├── Api/                        # API integration layer
│   │   ├── modules-api/           # Module-specific APIs
│   │   │   ├── ChannelApi.jsx     # Live channels API
│   │   │   ├── FavoritesApi.jsx   # Favorites management API
│   │   │   ├── HomeAdsApi.jsx     # Home advertisements API
│   │   │   ├── OttAppsApi.jsx     # OTT applications API
│   │   │   └── DefaultappApi.jsx  # Default apps API
│   │   │
│   │   ├── OAuthentication-Api/   # Authentication APIs
│   │   │   ├── LoginOtp.jsx       # OTP login API
│   │   │   └── profileApi.jsx     # User profile API
│   │   │
│   │   └── utils/
│   │       └── apiHelpers.jsx     # API utility functions
│   │
│   ├── Atomic-Common-Componenets/  # Common shared components
│   │   ├── Headerbar.jsx           # Application header
│   │   ├── NetworkCheck.jsx        # Network status monitor
│   │   ├── TheamChange.jsx         # Theme provider & switcher
│   │   └── useRemoteNavigation.js  # Remote control hook
│   │
│   ├── Atomic-ErrorThrow-Componenets/  # Error handling components
│   │   ├── NetworkError.jsx            # Network error display
│   │   ├── SubscriptionExpired.jsx     # Subscription expired notice
│   │   └── liveChannelsConnected.jsx   # Channel connection errors
│   │
│   ├── Atomic-Module-Componenets/  # Module-specific components
│   │   ├── Channels/
│   │   │   ├── ChannelCard.jsx    # Channel card display
│   │   │   └── StreamPlayer.jsx   # Live stream player
│   │   │
│   │   └── Home-Modules/
│   │       ├── ChannelsView.jsx   # Channels grid view
│   │       ├── DefaultApps.jsx    # Default apps display
│   │       ├── HomeAds.jsx        # Home advertisements
│   │       └── OttViews.jsx       # OTT content view
│   │
│   ├── Atomic-Reusable-Componenets/  # Reusable UI components
│   │   ├── buttons.jsx                # Button components
│   │   ├── cards.jsx                  # Card components
│   │   └── Image.jsx                  # Optimized image component
│   │
│   ├── Global-storage/             # Global state stores (RxJS)
│   │   ├── DefaultStoreApp.jsx     # Default apps store
│   │   ├── FavoritesStore.jsx      # Favorites store
│   │   ├── HomeStore.jsx           # Home screen store
│   │   ├── LiveChannelsStore.jsx   # Live channels store
│   │   ├── MoviesOttStore.jsx      # OTT content store
│   │   ├── NotificationStore.jsx   # Notifications store
│   │   └── SubscriptionStore.jsx   # Subscription store
│   │
│   ├── Modules/                    # Main application modules
│   │   ├── Home.jsx                # Home screen module
│   │   ├── HomeSidebar.jsx         # Navigation sidebar
│   │   ├── LiveChannels.jsx        # Live channels module
│   │   ├── LivePlayer.jsx          # Live player module
│   │   ├── MoviesOtt.jsx           # OTT content module
│   │   ├── Favorites.jsx           # Favorites module
│   │   ├── Notification.jsx        # Notifications module
│   │   ├── Subscription.jsx        # Subscription module
│   │   └── DefaultApp.jsx          # Default apps module
│   │
│   ├── OAuthenticate/              # Authentication modules
│   │   ├── bbnl.jsx                # BBNL video authentication
│   │   └── LoginOtp.jsx            # OTP login screen
│   │
│   ├── styles/                     # Global styles
│   │   └── webos-navigation.css    # webOS navigation styles
│   │
│   └── utils/                      # Utility functions
│       └── webos.js                # webOS-specific utilities
│
├── build/                          # Production build output
├── package.json                    # Project dependencies
├── postcss.config.js              # PostCSS configuration
├── REMOTE_CONTROL_GUIDE.md        # Remote control documentation
├── DeveloperMode.md               # Developer setup guide
└── com.lg.bbnl_2.0.0_all.ipk     # webOS package file
```

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16.x or higher) - [Download](https://nodejs.org/)
- **npm** (v8.x or higher) or **yarn** (v1.22.x or higher)
- **LG webOS TV SDK** (for deployment) - [Download](http://webostv.developer.lge.com/sdk/download/download-sdk/)
- **Git** - [Download](https://git-scm.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lg-iptv-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment** (if needed)
   - Create a `.env` file in the root directory
   - Add necessary API endpoints and configuration

### Development

Start the development server with hot reload:

```bash
npm start
# or
yarn start
```

The application will open at `http://localhost:3000` in your default browser.

**Development Features:**
- ✅ Hot Module Replacement (HMR)
- ✅ Live reloading
- ✅ Source maps for debugging
- ✅ Error overlay in browser

### Build

Create a production-optimized build:

```bash
npm run build
# or
yarn build
```

The optimized files will be generated in the `build/` directory:
- Minified JavaScript and CSS
- Optimized images and assets
- Production-ready `index.html`

### Testing

Run the test suite:

```bash
npm test
# or
yarn test
```

Run tests with coverage:

```bash
npm test -- --coverage
# or
yarn test --coverage
```

---

## 📦 Deployment

### Deploying to LG webOS TV

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Package the application**
   - The IPK file (`com.lg.bbnl_2.0.0_all.ipk`) is pre-generated
   - To create a new package, use the LG webOS CLI tools:
   ```bash
   ares-package build/
   ```

3. **Install on LG TV**
   
   **Option A: Using Developer Mode**
   - Enable Developer Mode on your LG TV (see `DeveloperMode.md`)
   - Connect to the TV:
     ```bash
     ares-setup-device --add tv <TV_IP_ADDRESS>
     ```
   - Install the app:
     ```bash
     ares-install --device tv com.lg.bbnl_2.0.0_all.ipk
     ```

   **Option B: Using LG Content Store**
   - Submit the IPK package through the LG Seller Lounge
   - Follow LG's app submission guidelines

4. **Launch the application**
   ```bash
   ares-launch --device tv com.lg.bbnl
   ```

5. **Debug on TV**
   ```bash
   ares-inspect --device tv com.lg.bbnl
   ```

---

## 🏗️ Architecture

### Component Architecture

The application follows an **Atomic Design** methodology:

```
Atomic-Reusable-Components (Atoms)
    ↓
Atomic-Module-Components (Molecules)
    ↓
Modules (Organisms)
    ↓
App (Template)
```

### State Management

- **RxJS Observables** - Used for global state management
- **React Context** - Theme management and authentication state
- **Local State** - Component-specific state with React hooks

### Routing Strategy

- **HashRouter** - Used for webOS compatibility
- **Protected Routes** - Authentication-based route guards
- **Navigation Guards** - Subscription and network status checks

### Data Flow

```
User Action → Component → API Helper → Axios Request
    ↓
API Response → RxJS Store → Component Update → UI Render
```

---

## 🔌 API Integration

### API Modules

| Module | Purpose | File Location |
|--------|---------|---------------|
| Channel API | Fetch live TV channels | `src/Api/modules-api/ChannelApi.jsx` |
| OTT Apps API | Get OTT applications | `src/Api/modules-api/OttAppsApi.jsx` |
| Favorites API | Manage user favorites | `src/Api/modules-api/FavoritesApi.jsx` |
| Home Ads API | Fetch advertisements | `src/Api/modules-api/HomeAdsApi.jsx` |
| Login OTP API | Authentication | `src/Api/OAuthentication-Api/LoginOtp.jsx` |
| Profile API | User profile data | `src/Api/OAuthentication-Api/profileApi.jsx` |

### API Helper Functions

Located in `src/Api/utils/apiHelpers.jsx`:
- Request interceptors
- Response handlers
- Error handling
- Token management
- Base URL configuration

---

## 🎮 Remote Control Navigation

The application is optimized for LG TV remote control navigation using spatial navigation:

### Supported Keys
- **Arrow Keys** (↑ ↓ ← →) - Navigate between elements
- **OK/Enter** - Select/Activate element
- **Back** - Return to previous screen
- **Home** - Return to home screen
- **Channel Up/Down** - Channel switching (in live TV)
- **Number Keys** - Direct channel selection
- **Color Keys** - Quick actions (Red, Green, Yellow, Blue)

### Implementation

Navigation is handled through:
- `src/Atomic-Common-Componenets/useRemoteNavigation.js` - Custom navigation hook
- `src/styles/webos-navigation.css` - Navigation styling
- `src/utils/webos.js` - webOS-specific event handlers

For detailed remote control guide, see [REMOTE_CONTROL_GUIDE.md](REMOTE_CONTROL_GUIDE.md)

---

## 👥 Contributing

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code structure
   - Add tests for new features
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm test
   npm run build
   ```

4. **Commit your changes**
   ```bash
   git commit -m "feat: add new feature"
   ```

5. **Push and create a pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Coding Standards

- **JavaScript:** ES6+ syntax
- **React:** Functional components with hooks
- **Styling:** Tailwind CSS utility classes + CSS modules
- **Naming:** PascalCase for components, camelCase for functions
- **File Structure:** One component per file

---

## 🐛 Troubleshooting

### Common Issues

**Issue: App doesn't load on LG TV**
- ✅ Verify Developer Mode is enabled (see `DeveloperMode.md`)
- ✅ Check TV firmware is up to date
- ✅ Ensure app is properly packaged with correct `appinfo.json`

**Issue: Network errors**
- ✅ Check internet connectivity on TV
- ✅ Verify API endpoints are accessible
- ✅ Review CORS settings on backend

**Issue: Video playback issues**
- ✅ Confirm video format compatibility (H.264, AAC)
- ✅ Check video URLs are accessible
- ✅ Verify Video.js version compatibility

**Issue: Remote control not working**
- ✅ Ensure webOS events are properly initialized
- ✅ Check navigation focus management
- ✅ Review `webos.js` utility configuration

### Debug Mode

Enable debug logging in webOS:
```bash
ares-inspect --device tv --open com.lg.bbnl
```

Access Chrome DevTools at the provided URL for debugging.

---

## 📄 License

This project is proprietary and confidential.  
**© 2026 LG-BBNL. All rights reserved.**

---

## 📞 Support

For technical support or questions:
- **Documentation:** Check `REMOTE_CONTROL_GUIDE.md` and `DeveloperMode.md`
- **Issues:** Report bugs through the issue tracker
- **LG Developer:** Visit [webostv.developer.lge.com](http://webostv.developer.lge.com/)

---

<div align="center">

**Built with ❤️ for LG webOS Smart TVs**

</div>
