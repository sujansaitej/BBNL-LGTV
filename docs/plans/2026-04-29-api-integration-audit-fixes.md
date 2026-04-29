# BBNL-LGTV API Integration Audit Remediation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring the LG webOS BBNL IPTV app into compliance with the published API spec (`BBNL-IPTV APIs.xlsx`), close critical authentication gaps, eliminate dead code, and harden reliability — without breaking the working channel/play paths.

**Architecture:**
- Centralise all transport in a single `apiClient` (axios instance) with environment-driven base URL, response interceptor for 401/403 session-expiry, and structured error mapping.
- Treat OTP verification as **server-authoritative** via `/addmacnew` (the spec's post-OTP device-registration step). Stop returning the OTP to the client.
- Bring every spec-mandatory payload field into the corresponding callsite, sourced from `useDeviceInformation()` + `sessionGet()`.
- Delete dead `API_ENDPOINTS` entries; add the missing high-value endpoints (`/userLogout`, `/addmacnew`, `/primarycustdet`, `/expiringchnl_list`).
- Preserve focus engine, MemoryRouter, and `GlobalBackHandler` invariants documented in `CLAUDE.md`.

**Tech Stack:** React 19, axios, zustand, hls.js, webOS Luna APIs, CRA, Jest (no current test suite — this plan introduces minimal smoke tests).

---

## Audit context (read first)

Spec source of truth: `BBNL-IPTV APIs.xlsx` (sheet `IPTV APIs`, 34 endpoints, rows 4–40). Production base URL per spec: `https://bbnlnetmon.bbnl.in/prod/cabletvapis`. Testing base URL: `http://124.40.244.211/netmon/cabletvapis/` (currently used).

Critical defects this plan targets:
1. OTP verification is client-side — `LoginOtp.jsx:169` does `otp === serverOtp` against the OTP returned in `/login` response body.
2. `/addmacnew` (post-OTP device registration) never called.
3. `/applock`, `/trpdata`, `/chnl_data`, `/login` all missing spec-mandatory fields.
4. `/userLogout` defined but never called — server retains session forever.
5. Plain HTTP testing URL hardcoded into source.
6. Hardcoded Basic Auth credential in source.
7. Five dead `API_ENDPOINTS` entries; one dead module (`OttAppsApi.jsx`).
8. No 401/403 axios response interceptor; stale auth persists.
9. AppLock checked once at boot only.
10. Public IP fetch fans out to 4 external services on every login.

---

## Conventions used in this plan

- `Files:` lists exact paths and line ranges where applicable.
- `Acceptance:` is the verification step. There is no existing test harness, so most tasks verify via:
  - `npm run build` succeeds (CRA's type/lint pipeline);
  - Manual smoke via `npm start` and DevTools Network tab; or
  - `ares-inspect --device tv com.lg.bbnl` on a real TV when noted.
- Each task ends with a commit. Use the existing commit-message style (no Conventional Commits, see `git log`).
- **Do not** introduce `React.lazy`, change `MemoryRouter`, alter focus DOM-attribute pattern, or "fix" the typoed paths `Deviceinformaction/`, `Modules-Erros/` — they are load-bearing per `CLAUDE.md`.

---

# Phase 0 — Foundation refactor (no behaviour change)

Goal: introduce one `apiClient`, environment-driven config, and a session-expiry interceptor. All later phases build on this. Ship Phase 0 in isolation and verify channel browsing + login still work before continuing.

### Task 0.1 — Add a `.env` template and read base URL from env

**Why:** Currently `API_BASE_URL_PROD` is a hardcoded constant pointing at the testing URL. Spec lists distinct prod and test URLs.

**Files:**
- Create: `.env.example`
- Create: `.env.development.local` (gitignored — confirm `.gitignore` already excludes `.env*.local`)
- Modify: `src/server/config.jsx:5`
- Modify: `.gitignore` (verify `.env*.local` is present)

**Step 1: Create `.env.example`**
```env
# Base URL for the BBNL IPTV API.
# Production: https://bbnlnetmon.bbnl.in/prod/cabletvapis
# Testing:    https://netmontest.bbnl.in/netmon/cabletvapis (preferred over the http://124.40.244.211 form)
REACT_APP_API_BASE_URL=https://netmontest.bbnl.in/netmon/cabletvapis

# Basic auth header value the spec requires on every request.
# Production credential is provisioned by BBNL — do not commit.
REACT_APP_API_BASIC_AUTH=Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=
```

**Step 2: Modify `src/server/config.jsx:5`**

Replace the const with:
```js
export const API_BASE_URL_PROD =
  process.env.REACT_APP_API_BASE_URL ||
  "https://netmontest.bbnl.in/netmon/cabletvapis";

const BASIC_AUTH =
  process.env.REACT_APP_API_BASIC_AUTH ||
  "Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=";
```

Then replace both literal `"Basic Zm9..."` strings (lines 18 and 27) with the `BASIC_AUTH` constant.

**Step 3: Confirm `.gitignore`**

Ensure these lines exist (CRA template usually includes them):
```
.env.local
.env.development.local
.env.test.local
.env.production.local
```

**Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds.

**Step 5: Smoke test login screen**

Run: `npm start`, open `http://localhost:3000`, confirm logo + login screen render and `/fofitv_logo` request fires (DevTools Network tab) at the new base URL.

**Step 6: Commit**
```bash
git add .env.example src/server/config.jsx .gitignore
git commit -m "config: load API base URL and basic-auth from env (REACT_APP_API_BASE_URL / REACT_APP_API_BASIC_AUTH)"
```

---

### Task 0.2 — Create a single axios `apiClient` instance

**Why:** Currently every module either uses the global `axios` (with global interceptor) or builds its own (`HomeAdsApi.jsx`). One instance gives us deterministic interceptor order and a place to attach response handling.

**Files:**
- Create: `src/server/apiClient.js`
- Modify: `src/server/config.jsx` (export client; keep legacy interceptor for now)

**Step 1: Create `src/server/apiClient.js`**
```js
import axios from "axios";
import { API_BASE_URL_PROD, getDefaultHeaders } from "./config";

export const apiClient = axios.create({
  baseURL: API_BASE_URL_PROD,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const headers = getDefaultHeaders();
  config.headers = { ...headers, ...(config.headers || {}) };
  return config;
});

export default apiClient;
```

**Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds; no callsite changes yet.

**Step 3: Commit**
```bash
git add src/server/apiClient.js
git commit -m "server: introduce shared apiClient (axios instance) — no callers yet"
```

---

### Task 0.3 — Add a 401/403 response interceptor that clears session

**Why:** Per spec, `err_code: 1, err_msg: "User Deactivated"` and `"Failed to authenticate"` are the deactivation/expiry signals. They come back as HTTP 200 with a body, plus sometimes HTTP 401/403. We need one place that detects them and forces re-login.

**Files:**
- Modify: `src/server/apiClient.js`
- Modify: `src/utils/session.js` (add `sessionInvalidate` helper)
- Create: `src/server/sessionExpiryBus.js` (tiny event bus the App listens on)
- Modify: `src/App.js` (subscribe to bus, route to `/login`)

**Step 1: Add `sessionInvalidate` to `src/utils/session.js`**

Add at end of file (do not change existing exports):
```js
export const sessionInvalidate = () => {
  try { sessionClear(); } catch {}
  try { localStorage.removeItem("isAuthenticated"); } catch {}
};
```

**Step 2: Create `src/server/sessionExpiryBus.js`**
```js
const listeners = new Set();
export const onSessionExpired = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const emitSessionExpired = (reason) => { listeners.forEach((fn) => { try { fn(reason); } catch {} }); };
```

**Step 3: Add response interceptor in `src/server/apiClient.js` (conservative)**

Append after the request interceptor. **Important:** only trigger on hard HTTP 401/403 — do NOT trigger on `err_code:1` body messages, because those messages also fire during normal flows (e.g. "Invalid User ID" during first-time login probe, "User ID already registered with another device" during the OTP login). Triggering on those would log the user out of a working session.

```js
import { emitSessionExpired } from "./sessionExpiryBus";

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      emitSessionExpired(`HTTP ${status}`);
    }
    return Promise.reject(error);
  }
);
```

**Step 4: Wire bus into `src/App.js`**

Find the existing `useEffect(() => { /* webOS env init */ }, [])` block and add a sibling effect (do not merge):

```jsx
import { onSessionExpired } from "./server/sessionExpiryBus";
import { sessionInvalidate } from "./utils/session";
// ...
useEffect(() => {
  return onSessionExpired((reason) => {
    console.warn("[session] expired:", reason);
    sessionInvalidate();
    setIsAuthenticated(false);
  });
}, []);
```

**Step 5: Verify build**

Run: `npm run build`
Expected: success.

**Step 6: Manual smoke test**

Run: `npm start`. Login, then in DevTools mock a 401 response on `/chnl_categlist` (Network → right-click → "Block request URL", or use the Overrides feature with a fake 401 body). Confirm app routes back to `/login`.

**Step 7: Commit**
```bash
git add src/server/apiClient.js src/server/sessionExpiryBus.js src/utils/session.js src/App.js
git commit -m "server: add 401/403 + err_code:1 session-expiry interceptor; auto-redirect to /login"
```

---

### Task 0.4 — Migrate `HomeStore` helpers to use `apiClient`

**Why:** `postJson`/`postForm` in `src/store/HomeStore.jsx` are used by stores. Migrating them is the leanest way to get most modules onto `apiClient` without rewriting every callsite.

**Files:**
- Modify: `src/store/HomeStore.jsx:1-28`

**Step 1: Replace `axios.post(url, ...)` with `apiClient.post(url, ...)`**

Change the imports:
```js
import apiClient from "../server/apiClient";
import { getDefaultHeaders } from "../server/config";
```

In `postJson` and `postForm`, replace `axios.post` with `apiClient.post`. Strip the `getDefaultHeaders()` spread since the interceptor now adds them automatically (keep the per-call `extraHeaders`).

**Step 2: Verify build**

Run: `npm run build`
Expected: success.

**Step 3: Smoke test channel browsing**

Run: `npm start`, log in, navigate to Live Channels — confirm categories + channels load.

**Step 4: Commit**
```bash
git add src/store/HomeStore.jsx
git commit -m "store: HomeStore helpers now use shared apiClient (drops manual header spread)"
```

---

# Phase 1 — Server-authoritative OTP & device registration  *(DEFERRED 2026-04-29)*

> 🛑 **Skipped in current execution.** Owner decision (2026-04-29): leave the existing client-side OTP compare path untouched to preserve production-ready login. Live test against the backend confirmed the server enforces one-user-per-device server-side (`"User ID already registered with another device"`), so the device-binding contract is at least partially intact even without this phase. Revisit when (a) backend team confirms which endpoint actually verifies OTP, and (b) we have a way to roll out without locking out existing logged-in users.

The original task breakdown below is preserved for future reference but **MUST NOT be executed** as part of the current rollout.

### Task 1.1 — Add `/addmacnew` integration

**Files:**
- Create: `src/server/OAuthentication-Api/AddDeviceApi.jsx`
- Modify: `src/server/config.jsx:35` (rename `Add_MACADDRESS` → `ADD_DEVICE` for clarity, or keep alias)

**Step 1: Create the API helper**
```jsx
// src/server/OAuthentication-Api/AddDeviceApi.jsx
import apiClient from "../apiClient";
import { API_ENDPOINTS } from "../config";

/**
 * Register the current device after OTP entry. Per BBNL spec (row 37, addmacnew),
 * mandatory fields are: userid, mobile, mac_address, device_name, device_type,
 * appversion, deviceID. The server validates the OTP server-side using the bound
 * mobile number and returns err_code:0 on success.
 */
export const registerDevice = async ({
  userid,
  mobile,
  otp,
  mac_address,
  ip_address,
  device_name = "LG TV",
  device_type = "LG TV",
  appversion = "2.0.0",
  deviceID,
  deviceModel,
  deviceManufacturer = "LG",
}) => {
  const payload = {
    userid: userid || "",
    mobile,
    otp, // server-side verification
    mac_address: mac_address || "",
    ip_address: ip_address || "",
    device_name,
    device_type,
    appversion,
    deviceID: deviceID || mac_address || "",
    deviceModel: deviceModel || "",
    deviceManufacturer,
  };

  try {
    const res = await apiClient.post(API_ENDPOINTS.Add_MACADDRESS, payload);
    const ok = res?.data?.status?.err_code === 0;
    return {
      success: ok,
      message: res?.data?.status?.err_msg || (ok ? "Device registered" : "Registration failed"),
      devid: res?.data?.body?.devid || null,
      data: res?.data,
    };
  } catch (err) {
    return {
      success: false,
      message: err?.response?.data?.status?.err_msg || err?.message || "Network error",
      data: err?.response?.data || null,
    };
  }
};
```

**Step 2: Verify build**

Run: `npm run build`
Expected: success.

**Step 3: Commit**
```bash
git add src/server/OAuthentication-Api/AddDeviceApi.jsx
git commit -m "server: add registerDevice() helper for /addmacnew (post-OTP device registration)"
```

---

### Task 1.2 — Replace client-side OTP compare with server-side `/addmacnew`

**Files:**
- Modify: `src/Modules/LoginOtp.jsx:166-175` (the `handleVerifyOtp` callback)
- Modify: `src/Modules/LoginOtp.jsx:151-153` (do **not** stash `setServerOtp` — drop it once verify is server-side)

**Step 1: Stop storing the server-returned OTP**

In the `handleGetOtp` callback (~line 138), remove `setServerOtp(String(result.otp || ""));`. Leave the `setStep(2)` transition.

**Step 2: Rewrite `handleVerifyOtp`**

Replace the body with:
```jsx
const handleVerifyOtp = useCallback(async () => {
  const { otp, phone, loading } = S.current;
  if (otp.length !== 4 || loading) return;
  setLoading(true);
  try {
    const userid = sessionGet("userId") || "";
    const result = await registerDevice({
      userid,
      mobile: phone,
      otp,
      mac_address: deviceInfo?.wiredMac || deviceInfo?.wifiMac || "",
      ip_address: deviceInfo?.privateIPv4 || deviceInfo?.publicIPv4 || "",
      deviceID: localStorage.getItem("lgtv_device_id_pinned") || "",
      deviceModel: deviceInfo?.modelName || "",
    });
    if (result.success) {
      onLoginSuccess?.();
      navigate("/home");
    } else {
      setShowOtpError(true);
    }
  } catch {
    setNetworkError(true);
  } finally {
    setLoading(false);
  }
}, [onLoginSuccess, navigate, deviceInfo]);
```

Add the import:
```jsx
import { registerDevice } from "../server/OAuthentication-Api/AddDeviceApi";
import { sessionGet } from "../utils/session";
```

**Step 3: Remove the now-unused `serverOtp` state**

Delete the `useState("")` for `serverOtp` and any references in `S.current`.

**Step 4: Verify build**

Run: `npm run build`
Expected: success.

**Step 5: Manual smoke test**

Run: `npm start`. Enter a real mobile, request OTP, type any 4 digits. The server now decides — confirm:
- Wrong OTP → `setShowOtpError(true)` shows the error overlay.
- Correct OTP → navigate to `/home` only on `err_code:0`.

**Step 6: Commit**
```bash
git add src/Modules/LoginOtp.jsx
git commit -m "auth: server-authoritative OTP verification via /addmacnew (drops client-side compare)"
```

---

### Task 1.3 — Delete unused `verifyOtp()` exports

**Why:** Both `AuthStore.jsx:73-95` and `LoginOtpApi.jsx:205-242` define `verifyOtp` that POSTs to `/loginOtp` (resend endpoint) — wrong endpoint, no callers, dead path.

**Files:**
- Modify: `src/store/AuthStore.jsx:73-95` (remove the action)
- Modify: `src/server/OAuthentication-Api/LoginOtpApi.jsx:205-242` (remove the export)

**Step 1: Delete the `verifyOtp` action in `AuthStore.jsx`**

Remove lines 73-95 (the entire `verifyOtp: async (...) => {...}` block).

**Step 2: Delete `verifyOtp` in `LoginOtpApi.jsx`**

Remove lines 204-242 (`// Verify OTP` comment + the export).

**Step 3: Confirm no remaining importers**

Run a grep: `grep -rn "verifyOtp" src/` — expect zero hits.

**Step 4: Verify build**

Run: `npm run build`
Expected: success.

**Step 5: Commit**
```bash
git add src/store/AuthStore.jsx src/server/OAuthentication-Api/LoginOtpApi.jsx
git commit -m "auth: remove dead verifyOtp() exports (replaced by registerDevice in LoginOtp flow)"
```

---

# Phase 2 — Spec-mandatory payload fixes

Goal: align every active endpoint's request body with the spec's "Mandatory" list.

### Task 2.1 — `/applock` payload: add `userid` and `appversion`

**Files:**
- Modify: `src/server/OAuthentication-Api/Applock.jsx:8-19`
- Modify: `src/App.js:132-145` (pass `userid` from session)

**Step 1: Update `Applock.jsx`**

Replace `reqBody` construction with:
```js
const reqBody = {
  userid: payload.userid || "",
  mobile: payload.mobile || "",
  ip_address: payload.ip_address || "",
  appversion: payload.appversion || "2.0.0",
};
```

(Remove `device_name`, `device_type`, `devdets` — spec doesn't request them on this endpoint.)

**Step 2: Update `App.js:134`**

Add `userid` and `appversion` from session and `package.json`:
```jsx
import { sessionGet } from "./utils/session";
// ...
const result = await checkAppLock({
  userid: sessionGet("userId") || "",
  mobile: sessionGet("userPhone") || "",
  ip_address: deviceInfo.publicIPv4 || deviceInfo.privateIPv4 || "",
  appversion: "2.0.0",
});
```

**Step 3: Verify build**

Run: `npm run build`
Expected: success.

**Step 4: Smoke test**

Login, watch DevTools → confirm `/applock` request body matches spec row 18.

**Step 5: Commit**
```bash
git add src/server/OAuthentication-Api/Applock.jsx src/App.js
git commit -m "applock: include mandatory userid + appversion in /applock payload (spec row 18)"
```

---

### Task 2.2 — `/trpdata` payload: add `userid` and `chid`, drop `stream`

**Files:**
- Modify: `src/server/modules-api/trpdata.jsx:4-16`
- Modify: `src/Modules/LivePlayer.jsx:186-201`

**Step 1: Update `trpdata.jsx` signature**

```js
export const postTrpData = async ({ userid, mobile, ip_address, chid }) => {
  const payload = {
    userid: String(userid || "").trim(),
    mobile: String(mobile || "").trim(),
    ip_address: String(ip_address || "").trim(),
    chid: String(chid || "").trim(),
  };

  if (!payload.userid || !payload.mobile || !payload.chid) {
    return { success: false, message: "Missing userid/mobile/chid for TRP data", data: null };
  }
  // ... rest unchanged ...
};
```

**Step 2: Update `LivePlayer.jsx:195-201`**

Replace the TRP effect with:
```jsx
useEffect(() => {
  const ch = currentChannelRef.current;
  const chid = ch?.chid || ch?.channelid || "";
  if (!chid || !mobile || !ip || !userid) return;
  if (lastTrpChid.current === chid) return;
  lastTrpChid.current = chid;
  postTrpData({ userid, mobile, ip_address: ip, chid }).catch(() => {});
}, [currentStream, mobile, ip, userid]);
```

(Rename the `lastTrpStream` ref to `lastTrpChid` for clarity, and ensure `currentChannelRef` is available — if it isn't, derive `chid` from the same channel object the player resolves; check the `selectChannel` path around line 174.)

**Step 3: Verify build**

Run: `npm run build`
Expected: success.

**Step 4: Smoke test**

Play a channel, watch Network → `/trpdata` body should now have `{userid, mobile, ip_address, chid}`.

**Step 5: Commit**
```bash
git add src/server/modules-api/trpdata.jsx src/Modules/LivePlayer.jsx
git commit -m "trpdata: send mandatory userid+chid (drop spurious stream URL) per spec row 36"
```

---

### Task 2.3 — `/chnl_data` payload: add mandatory `mac_address`

**Files:**
- Modify: `src/store/LiveChannelsStore.jsx:126` and surrounding `fetchChannels` action
- Modify: `src/server/modules-api/ChannelApi.jsx:23` (`fetchChannels` helper)

**Step 1: Update `ChannelApi.jsx`**

Change `fetchChannels({ userid, mobile, grid })` to accept and forward `mac_address`:
```js
export const fetchChannels = async ({ userid, mobile, grid, mac_address }) => {
  const res = await apiClient.post(API_ENDPOINTS.CHANNEL_DATA, {
    userid, mobile, grid, mac_address: mac_address || "",
  });
  return res.data;
};
```

**Step 2: Update `LiveChannelsStore.jsx` callsites**

Pass `mac_address` from the existing `useDeviceInformation()` consumer at the call boundary. Where the store action is invoked (e.g. `Home.jsx`, `LiveChannels.jsx`, `LivePlayer.jsx`), pull `deviceInfo.wiredMac || deviceInfo.wifiMac` and forward it.

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Smoke test**

Open `Live Channels`, watch Network → `/chnl_data` body now has `mac_address`.

**Step 5: Commit**
```bash
git add src/store/LiveChannelsStore.jsx src/server/modules-api/ChannelApi.jsx src/Modules/Home.jsx src/Modules/LiveChannels.jsx src/Modules/LivePlayer.jsx
git commit -m "chnl_data: include mandatory mac_address in payload (spec row 35)"
```

---

### Task 2.4 — `/login` payload: add top-level `mac_address`

**Files:**
- Modify: `src/store/HomeStore.jsx:32-40` (`buildAuthPayload`)
- Modify: `src/Modules/LoginOtp.jsx:143-147` (pass `mac_address` from `deviceInfo`)

**Step 1: Extend `buildAuthPayload`**

```js
export const buildAuthPayload = (phone, options = {}) => ({
  userid: options.userid || "",
  mobile: phone,
  mac_address: options.mac_address || "",
  email: options.email || "",
  device_name: options.device_name || "LG TV",
  ip_address: options.ip_address || "",
  device_type: options.device_type || "LG TV",
  getuserdet: options.getuserdet || "",
  devdets: options.devdets || { brand: "LG", model: "", mac: "" },
});
```

**Step 2: Pass `mac_address` from the login screen**

In `LoginOtp.jsx`, in the `sendOtp(...)` call (~line 143):
```jsx
const mac = deviceInfo?.wiredMac || deviceInfo?.wifiMac || "";
const result = await sendOtp(phone, {
  ip_address: deviceInfo.privateIPv4 || deviceInfo.publicIPv4 || "",
  device_name: "LG TV", device_type: "LG TV",
  mac_address: mac,
  devdets: { brand: "LG", model: deviceInfo.modelName || "", mac },
});
```

(Same change for the `resendOtp` call.)

**Step 3: Verify build & smoke test**

Run: `npm run build`. Login, watch Network → `/login` body has top-level `mac_address`.

**Step 4: Commit**
```bash
git add src/store/HomeStore.jsx src/Modules/LoginOtp.jsx
git commit -m "login: include top-level mac_address in /login + /loginOtp payloads (spec row 4)"
```

---

### Task 2.5 — `/feedback` payload: drop hardcoded fake MAC, use real device

**Files:**
- Modify: `src/Modules/Feedback.jsx:74-76`

**Step 1: Source MAC from `useDeviceInformation()` and `device_type` from constant**

Replace the hardcoded:
```js
mac_address: "26:F2:AE:D8:3F:99",
device_name: "rk3368_box",
device_type: "FOFI",
```

With:
```js
mac_address: deviceInfo?.wiredMac || deviceInfo?.wifiMac || "",
device_name: deviceInfo?.modelName || "LG TV",
device_type: "LG TV",
```

(Add `useDeviceInformation` import if not already present.)

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Smoke test**

Submit feedback, watch Network → `/feedback` body shows real MAC.

**Step 4: Commit**
```bash
git add src/Modules/Feedback.jsx
git commit -m "feedback: send real device MAC + model (replaces hardcoded rk3368_box / FOFI tag)"
```

---

# Phase 3 — Missing endpoint integration

### Task 3.1 — Wire `/userLogout` into the logout flow

**Files:**
- Create: `src/server/OAuthentication-Api/LogoutApi.jsx`
- Modify: `src/App.js:178-182` (`handleLogout`)
- Modify: `src/Modules/Setting.jsx:46-47` if logout dispatched there directly

**Step 1: Create `LogoutApi.jsx`**
```jsx
import apiClient from "../apiClient";
import { API_ENDPOINTS } from "../config";

export const userLogout = async ({ userid, mobile, ip_address, mac_address, useraction = "manual" }) => {
  try {
    const res = await apiClient.post(API_ENDPOINTS.USE_LOGOUT, {
      userid: userid || "",
      mobile: mobile || "",
      ip_address: ip_address || "",
      mac_address: mac_address || "",
      useraction,
    });
    return { success: res?.data?.status?.err_code === 0, data: res?.data };
  } catch (err) {
    return { success: false, message: err?.message, error: err };
  }
};
```

**Step 2: Update `App.js:178`**

```jsx
const handleLogout = async () => {
  const userid = sessionGet("userId") || "";
  const mobile = sessionGet("userPhone") || "";
  const ip = deviceInfo.publicIPv4 || deviceInfo.privateIPv4 || "";
  const mac = deviceInfo.wiredMac || deviceInfo.wifiMac || "";
  // Fire-and-forget — never block the UI on logout success.
  userLogout({ userid, mobile, ip_address: ip, mac_address: mac }).catch(() => {});
  setIsAuthenticated(false);
  sessionClear();
  logSessionState('session.logout');
};
```

**Step 3: Verify build & smoke test**

Run: `npm run build`. Logout from Settings → Confirm → DevTools shows `/userLogout` POST.

**Step 4: Commit**
```bash
git add src/server/OAuthentication-Api/LogoutApi.jsx src/App.js
git commit -m "logout: notify server via /userLogout on user-initiated logout (spec row 20)"
```

---

### Task 3.2 — Wire `/allowedapps` into the OTT-apps row on Home

**Why:** `OttAppsApi.jsx` is dead. Either delete it (Task 4.x) or wire it. Decision: wire it — the spec calls this out as an active feature (row 39, dated 2025).

**Files:**
- Create: `src/store/OttAppsStore.jsx`
- Modify: `src/Modules/Home.jsx` (consume the store; replace any hardcoded OTT app list)

**Step 1: Create `OttAppsStore.jsx`**

Pattern after `LivePlayersStore.jsx` (per-userid+mobile cache, 30-min TTL).

**Step 2: Render apps in Home**

Replace any hardcoded OTT app list with `useOttAppsStore().apps`. Each app object: `{ appname, icon, pkgid }`. Keep focus styles consistent with existing focusable-card class set.

**Step 3: Verify build & smoke test**

Run: `npm run build`. Home screen renders OTT apps from the API; missing pkgid still renders icon (graceful degradation).

**Step 4: Commit**
```bash
git add src/store/OttAppsStore.jsx src/Modules/Home.jsx
git commit -m "home: load OTT apps row from /allowedapps with 30-min cache (spec row 39)"
```

---

### Task 3.3 — Re-poll `/applock` on app resume / focus

**Why:** Currently runs once at boot; remote lock changes don't propagate.

**Files:**
- Modify: `src/App.js` (the `runLockCheck` `useEffect`)

**Step 1: Add visibility/focus listeners**

```jsx
useEffect(() => {
  if (!isAuthenticated || deviceInfo.loading) return;
  let cancelled = false;

  const run = async () => {
    const result = await checkAppLock({
      userid: sessionGet("userId") || "",
      mobile: sessionGet("userPhone") || "",
      ip_address: deviceInfo.publicIPv4 || deviceInfo.privateIPv4 || "",
      appversion: "2.0.0",
    });
    if (!cancelled && result?.locked) setIsLocked(true);
  };

  run();
  const onVis = () => { if (document.visibilityState === "visible") run(); };
  document.addEventListener("visibilitychange", onVis);
  const interval = setInterval(run, 15 * 60 * 1000); // 15-min ceiling

  return () => {
    cancelled = true;
    document.removeEventListener("visibilitychange", onVis);
    clearInterval(interval);
  };
}, [isAuthenticated, deviceInfo.loading, deviceInfo.publicIPv4, deviceInfo.privateIPv4]);
```

**Step 2: Verify build & smoke test**

Run: `npm run build`. Background/foreground the dev server tab — confirm `/applock` re-fires.

**Step 3: Commit**
```bash
git add src/App.js
git commit -m "applock: re-check on visibility change + 15-min interval (was once-at-boot)"
```

---

### Task 3.4 — Centralise `/errorimages` calls behind a shared store

**Why:** Four pages (`ValidOTP`, `RegisterNumber`, `ServiceLocked`, `MoviesOtt`) call `axios.post(API_ENDPOINTS.ERROR_IMAGES, ...)` directly with `mobile: localStorage.getItem("userPhone") || "0000000000"`. No retries, no cache, placeholder mobile pollutes server logs.

**Files:**
- Create: `src/store/ErrorImagesStore.jsx`
- Modify: `src/error/OAuthentication/ValidOTP.jsx:14-30`
- Modify: `src/error/OAuthentication/RegisterNumber.jsx:14-30`
- Modify: `src/error/Modules-Erros/ServiceLocked.jsx:24-40`
- Modify: `src/error/Modules-Erros/MoviesOtt.jsx:15-30`

**Step 1: Create `ErrorImagesStore.jsx`**

Single fetch, 1-hour TTL, accepts an optional `key` param (e.g. `LG_IPTV_LOGIN_BG`, `NO_LOGIN`, `SERVICE_LOCKED`, `COMING_SOON_OTT`) and returns the corresponding URL. When `userPhone` is absent, omit `mobile` from the payload (server should accept and return generic images per spec).

**Step 2: Replace the four direct `axios.post` calls**

Use `useErrorImagesStore().get(key)`.

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Smoke test**

Visit each error overlay → confirm images render and `/errorimages` is hit at most once per session.

**Step 5: Commit**
```bash
git add src/store/ErrorImagesStore.jsx src/error/OAuthentication/ValidOTP.jsx src/error/OAuthentication/RegisterNumber.jsx src/error/Modules-Erros/ServiceLocked.jsx src/error/Modules-Erros/MoviesOtt.jsx
git commit -m "errorimages: centralise via store; drop placeholder 0000000000 mobile (spec row 40)"
```

---

# Phase 4 — Dead config + module cleanup

Decision: keep entries that we actually plan to wire in Phase 5+ (`expiringchnl_list`, `streamAds`, `raiseTicket`); delete entries that have no roadmap.

### Task 4.1 — Remove unused `OttAppsApi.jsx` after Task 3.2

If Task 3.2 used the existing helper, skip this. Otherwise delete the file.

### Task 4.2 — Audit and trim `API_ENDPOINTS`

**Files:**
- Modify: `src/server/config.jsx:32-51`

**Step 1:** For each entry, mark whether a planned task wires it. If no plan → delete.

**Step 2:** Add a `// Reserved for Phase X` comment for entries kept as future work.

**Step 3:** Verify build, commit.

---

# Phase 5 — Reliability hardening

### Task 5.1 — Add public-IP cache + circuit breaker

**Why:** `LG-Devicesinformaction.jsx:178-190` calls `ipify`/`seeip`/`icanhazip`/`amazonaws` on every login. Cache the result in localStorage with 24-hr TTL; skip if already cached.

**Files:**
- Modify: `src/server/Deviceinformaction/LG-Devicesinformaction.jsx`

### Task 5.2 — Add request deduplication to `LiveChannelsStore`

**Why:** Mashing the remote re-triggers fetches. Track in-flight promises by cache key.

**Files:**
- Modify: `src/store/LiveChannelsStore.jsx`

### Task 5.3 — Standardise error parsing

**Why:** `FeedBackApi.jsx:18` returns raw `response.data`; others extract `status.err_code`. Create one helper:

```js
// src/server/parseApiResponse.js
export const parseApiResponse = (response) => {
  const status = response?.data?.status;
  return {
    ok: status?.err_code === 0,
    code: status?.err_code,
    message: status?.err_msg || "",
    body: response?.data?.body,
    raw: response?.data,
  };
};
```

Replace every ad-hoc check across `src/server/`.

---

# Phase 6 — Optional spec endpoints (build only when product asks)

These are spec endpoints that no current UI demands. Keep this list as a backlog. Each is a self-contained mini-plan.

| Endpoint | Spec row | Suggested feature |
|---|---|---|
| `/primarycustdet` (5) | row 10 | Profile/Settings → "Account info" panel |
| `/expiringchnl_list` (16) | row 22 | Settings → "Expiring channels" badge |
| `/streamAds` (15) | row 21 | StreamPlayer overlay (FOFI ad slots) |
| `/raiseTicket` (3) | row 7 | Settings → "Help & Support" form |
| `/ssologin` (25) | row 31 | Boot path: try SSO before showing login |
| `/getdeviceid` + `/devAuth` (27,28) | rows 33,34 | RSA keypair anti-piracy — significant work; coordinate with backend |
| `/ottlogs` (26) | row 32 | Diagnostic log uploader |
| `/updateMobNum` (32) | row 38 | Settings → "Update mobile number" |
| `/addusers` (10) | row 16 | Settings → "Multi-user" |

---

# Phase 7 — Verification and rollout

### Task 7.1 — End-to-end smoke checklist

Run on a real LG TV (`ares-launch --device tv com.lg.bbnl`):

- [ ] Cold launch → splash → login screen renders logo via `/fofitv_logo`.
- [ ] Enter mobile → `/login` request body has `mobile`, `mac_address`, `device_name=LG TV`, `devdets`.
- [ ] OTP screen → enter 4 digits → `/addmacnew` POST with `userid`, `mobile`, `otp`, `mac_address`.
- [ ] On success → `/applock` POST with `userid`, `mobile`, `ip_address`, `appversion`.
- [ ] Home → categories load via `/chnl_categlist`; OTT apps load via `/allowedapps`.
- [ ] Live channels → `/chnl_data` POST has `mac_address`.
- [ ] Play a channel → `/trpdata` POST has `userid`, `mobile`, `ip_address`, `chid`.
- [ ] Backgound app, foreground → `/applock` re-fires.
- [ ] Logout → `/userLogout` POST.
- [ ] Backend force-deactivate user → next request returns `err_code:1, err_msg:"User Deactivated"` → app routes to `/login`.

### Task 7.2 — Update `CLAUDE.md`

Add a section noting:
- Base URL is now env-driven.
- All HTTP goes through `apiClient` (not raw `axios`).
- OTP verification is server-side via `/addmacnew`.
- Session expiry is centralised in `apiClient` response interceptor.

---

# Skills referenced

- @superpowers:executing-plans — execute task-by-task with review checkpoints.
- @superpowers:subagent-driven-development — fast iteration via fresh subagent per task.
- @superpowers:test-driven-development — when adding tests in Phase 5.
- @superpowers:verification-before-completion — required before claiming any phase done.

---

# Risk register

| Risk | Mitigation |
|---|---|
| Backend doesn't accept `/addmacnew` as OTP-verifier | Confirm endpoint contract with BBNL backend BEFORE Phase 1. If no, ask for the actual verify endpoint. |
| `mac_address` not retrievable on some webOS firmware | `useDeviceInformation()` already falls back through `wiredMac` → `wifiMac` → empty. Server tolerates empty per other apps. |
| Session-expiry interceptor causes infinite logout loop on `/login` 401s | Whitelist `/login`, `/loginOtp`, `/fofitv_logo` in the interceptor. |
| `apiClient` migration breaks the custom retry logic in `HomeAdsApi.jsx` | Move retry logic into a wrapper in `ChannelsSearchStore`; keep the JSON↔form fallback. |
| Production base URL change breaks dev workflow | Default `.env.example` to testing URL; production URL only in `.env.production`. |
