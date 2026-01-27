# 1. Build your React app
cd C:\LG-BBNL-UI\lg-iptv-app
npm run build

# 2. Package the app
ares-package build

# 3. Install/Update on TV (this will overwrite the existing app)
ares-install --device mylgtv com.lg.bbnl_2.0.0_all.ipk

# 4. Launch the app
ares-launch --device mylgtv com.lg.bbnl


# Open inspector in your terminal
ares-inspect --device mylgtv --app com.lg.bbnl --open