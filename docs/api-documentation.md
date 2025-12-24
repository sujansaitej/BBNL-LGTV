# API Reference (Login, Home, All Channels)

This document captures all APIs used by the LG app for the Login, Home, and All Channels pages so another developer can integrate them directly in HTML/CSS/JS (e.g., Samsung TV).

- Auth/channel base URL: `http://124.40.244.211/netmon/cabletvapis`
- Ads base URL: `https://bbnlnetmon.bbnl.in/prod/cabletvapis`
- Common headers (unless noted):
  - `Authorization: Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=`
  - `devslno: FOFI20191129000336`
  - `Content-Type: application/json` (switches to `application/x-www-form-urlencoded` when noted)
  - Ads API also sends `devmac: 68:1D:EF:14:6C:21`
- Login stores `userPhone` and `userId` in `localStorage`; later pages depend on them.

---

## Login Page

### Request OTP
- Purpose: Send OTP to mobile.
- Endpoint: `POST /login`
- Headers: `Content-Type: application/json`, `Authorization`, `devslno`
- Request body:
```json
{"userid":"testiser1","mobile":"9876543210"}
```
- Success response (HTTP 200):
```json
{"status":{"err_code":0,"err_msg":"OTP sent"}}
```
- Error response (HTTP 200 with error code):
```json
{"status":{"err_code":9,"err_msg":"Invalid mobile"}}
```
- UI use: On `err_code:0`, advance to OTP entry and show success; otherwise display `err_msg`.

### Verify OTP / Login
- Purpose: Validate OTP and establish session.
- Endpoint: `POST /loginOtp`
- Headers: same as above.
- Request body:
```json
{"userid":"testiser1","mobile":"9876543210","otpcode":"1234"}
```
- Success response (HTTP 200):
```json
{"status":{"err_code":0,"err_msg":"OK"},"userid":"testiser1"}
```
- Error response (HTTP 200 with error code):
```json
{"status":{"err_code":9,"err_msg":"Invalid OTP"}}
```
- UI use: On `err_code:0`, store `userPhone` and `userId` in `localStorage`, mark authenticated, navigate to `/home`. On error, clear OTP field and show `err_msg`.
- Network errors (timeout/offline) surface as axios errors; UI shows a retry component.

---

## Home Page (Ads Slider)

### IPTV Ads
- Purpose: Fetch ad assets for the homepage slider.
- Endpoint: `POST /iptvads`
- Base URL: `https://bbnlnetmon.bbnl.in/prod/cabletvapis`
- Headers: `Authorization`, `devslno`, `devmac`, `Content-Type: application/json` (may retry as form-encoded)
- Request body (JSON; minimal):
```json
{"userid":"testiser1","mobile":"9876543210","adclient":"fofi","srctype":"image","displayarea":"homepage","displaytype":"multiple"}
```
- Optional fields: `ip_address`, `mac_address`, `displaytype` override, `srctype` can be `video`.
- Success response (HTTP 200):
```json
{"status":{"err_code":0,"err_msg":"OK"},"body":[{"adpath":"https://.../banner1.jpg"},{"adpath":"https://.../banner2.jpg"}]}
```
- Error response: `status.err_code != 0` with message, or network error.
- UI use: Extract `body[].adpath` into an array and render as auto-rotating slider (image or video based on `srctype`). Missing `mobile` prevents call and shows “Mobile number required”. Errors show inline message; component retries with form encoding if JSON fails.

---

## All Channels Page

### Channel Categories
- Purpose: Fetch channel category list.
- Endpoint: `POST /chnl_categlist`
- Headers: `Authorization`, `devslno`, `Content-Type: application/json`
- Request body:
```json
{"userid":"testiser1","mobile":"9876543210","ip_address":"192.168.101.110","mac_address":"68:1D:EF:14:6C:21"}
```
- Success response (HTTP 200):
```json
{"status":{"err_code":0,"err_msg":"OK"},"body":[{"categories":[{"grtitle":"All Channels","grid":"0"},{"grtitle":"News","grid":"12"}]}]}
```
- Error response: same shape with non-zero `err_code`.
- UI use: Map `grtitle`/`grid` to filter pills. Default filter “All Channels”.

### Channel List
- Purpose: Fetch channel data for the user.
- Endpoint: `POST /chnl_data`
- Headers: `Authorization`, `devslno`, `Content-Type: application/json`
- Request body:
```json
{"userid":"testiser1","mobile":"9876543210","ip_address":"192.168.101.110","mac_address":"68:1D:EF:14:6C:21"}
```
- Success response (HTTP 200):
```json
{"status":{"err_code":0,"err_msg":"OK"},"body":[{"chtitle":"Star Sports","chlogo":"http://.../star.png","subscribed":"yes","grid":"12","streamlink":"http://.../stream.m3u8"}]}
```
- Error response (HTTP 200 with error code):
```json
{"status":{"err_code":9,"err_msg":"Invalid credentials"}}
```
- UI use: On `err_code:0`, populate channels and default filter view. Filters: “All Channels”, “Subscribed Channels” (`subscribed === "yes"`), or specific `grid`. Clicking a channel with `streamlink` opens player with `streamlink` + `chtitle`; missing `streamlink` shows inline error. If `mobile` is absent in `localStorage`, page shows “Login Required” and link to `/login`.

---

## Integration Notes (Samsung TV)
- Persist `userId` and `userPhone` after OTP login; subsequent calls require them.
- Always send the Basic auth header and device IDs (`devslno`, and `devmac` for ads). Replace with Samsung-specific values if provided by the backend.
- Treat non-zero `status.err_code` as failure even when HTTP is 200. Drive UI from `err_code`, not HTTP status.
- Handle network timeouts/offline states gracefully (OTP flow shows retry; mirror the pattern elsewhere).
- Player expects `streamlink` to be a playable URL (HLS in current app); validate before playback.
