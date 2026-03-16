# BBNL IPTV — LG webOS Developer Mode Deploy Guide

## App Info
- **App ID:** `com.bbnl.iptv`   ← CHANGED (was com.lg.bbnl — reserved for LG system apps)
- **Version:** `2.0.0`
- **IPK file:** `com.bbnl.iptv_2.0.0_all.ipk`

---

## Full deploy (build → package → install → launch)

```bash
# 1. Build React app
npm run build
ares-package build --outdir .
ares-install --device mylgtv --remove com.lg.bbnl
ares-install --device mylgtv com.bbnl.iptv_2.0.0_all.ipk
ares-launch --device mylgtv com.bbnl.iptv
ares-inspect --device mylgtv --app com.bbnl.iptv --open
```

## Quick one-liner re-deploy

```bash
npm run build && ares-package build --outdir . && ares-install --device mylgtv com.bbnl.iptv_2.0.0_all.ipk && ares-launch --device mylgtv com.bbnl.iptv
```
