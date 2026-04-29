import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDeviceInformation } from "../server/Deviceinformaction/LG-Devicesinformaction";
import useAppVersionStore from "../store/LogineOttp";
import usePrimaryCustDetStore from "../store/PrimaryCustDetStore";
import useExpiringChannelsStore from "../store/ExpiringChannelsStore";
import useRaiseTicketStore from "../store/RaiseTicketStore";
import useAddUsersStore from "../store/AddUsersStore";
import { requestMobileUpdate } from "../server/modules-api/UpdateMobNumApi";
import { sessionClear } from "../utils/session";

const ArrowBackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" /></svg>;
const WarningIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="80" height="80" fill="#f44336"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>;
const WarningSmallIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="34" height="34" fill="#f44336"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>;

const Spinner = ({ size = 24 }) => (
  <>
    <style>{`@keyframes _spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    <div style={{ display: "inline-block", width: size, height: size, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "_spin 1s linear infinite" }} />
  </>
);

// Toast — slides down from top, auto-dismiss after 2.5s.
const Toast = ({ message, onDone }) => {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onDone?.(), 2500);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return <div className="bbnl-toast">{message}</div>;
};

const menuItems = [
  { id: "about", label: "About App", icon: <InfoIcon /> },
  { id: "device", label: "Device Info", icon: <InfoIcon /> },
  { id: "account", label: "Account Info", icon: <InfoIcon /> },
  { id: "expiring", label: "Expiring Channels", icon: <InfoIcon /> },
  { id: "support", label: "Help & Support", icon: <InfoIcon /> },
  { id: "mobile", label: "Update Mobile", icon: <InfoIcon /> },
  { id: "users", label: "Manage Users", icon: <InfoIcon /> },
  { id: "logout", label: "Logout", icon: <LogoutIcon /> },
];

const Setting = ({ onLogout }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState("about");
  const [appVersionData, setAppVersionData] = useState(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [toast, setToast] = useState("");
  const [customerData, setCustomerData] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [expiringList, setExpiringList] = useState([]);
  const [expiringLoading, setExpiringLoading] = useState(false);
  const [supportComment, setSupportComment] = useState("");
  const [isMobileSubmitting, setIsMobileSubmitting] = useState(false);
  const [mobileStatus, setMobileStatus] = useState({ kind: "", message: "" });
  const [usersMobile, setUsersMobile] = useState("");
  const { versionCache, fetchAppVersion } = useAppVersionStore();
  const { cache: custCache, fetchCust } = usePrimaryCustDetStore();
  const { cache: expCache, fetchExpiring } = useExpiringChannelsStore();
  const { isSubmitting: isTicketSubmitting, submit: submitTicket } = useRaiseTicketStore();
  const {
    isSubmitting: isUsersSubmitting,
    lastResults: usersLastResults,
    submit: submitAddUsers,
  } = useAddUsersStore();
  const deviceInfo = useDeviceInformation();

  const handleLogout = () => {
    if (onLogout) onLogout();
    else sessionClear(); // clears localStorage + sessionStorage + session cookies
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const loadAppVersion = async () => {
      try {
        const userid = localStorage.getItem("userId") || "";
        const mobile = localStorage.getItem("userPhone") || "";
        const payload = { userid, mobile, ip_address: "192.168.101.110", device_type: "", mac_address: "", device_name: "", app_package: "com.fofi.fofiboxtv" };
        const key = `${userid}|${mobile}|${payload.app_package}`;
        const cached = versionCache[key]?.data;
        if (cached) setAppVersionData(cached);
        const versionData = await fetchAppVersion(payload);
        if (versionData) setAppVersionData(versionData);
      } catch (error) { console.error("Failed to fetch app version:", error); }
    };
    loadAppVersion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Account Info — fetch primary customer details when entering the page ─
  useEffect(() => {
    if (currentPage !== "account") return;
    const userid = localStorage.getItem("userId") || "";
    if (!userid) return;

    // Hydrate from cache immediately if present
    const cached = custCache?.[userid]?.customer || null;
    if (cached) setCustomerData(cached);

    let cancelled = false;
    setCustomerLoading(!cached);
    (async () => {
      const res = await fetchCust(userid);
      if (cancelled) return;
      if (res?.customer) setCustomerData(res.customer);
      setCustomerLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // ── Expiring Channels — fetch when entering the page ────────────────────
  useEffect(() => {
    if (currentPage !== "expiring") return;
    const userid = localStorage.getItem("userId") || "";
    const mobile = localStorage.getItem("userPhone") || "";
    if (!userid || !mobile) return;

    // Hydrate from cache immediately if present
    const key = `${userid}|${mobile}`;
    const cached = expCache?.[key]?.channels;
    if (Array.isArray(cached)) setExpiringList(cached);

    let cancelled = false;
    setExpiringLoading(!Array.isArray(cached) || cached.length === 0);
    (async () => {
      const res = await fetchExpiring({ userid, mobile });
      if (cancelled) return;
      if (Array.isArray(res?.channels)) setExpiringList(res.channels);
      setExpiringLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handleMobileUpdate = async () => {
    if (isMobileSubmitting) return;
    const userid = localStorage.getItem("userId") || "";
    if (!userid) {
      const msg = "Missing user ID — please re-login";
      setMobileStatus({ kind: "error", message: msg });
      setToast(msg);
      return;
    }
    setIsMobileSubmitting(true);
    setMobileStatus({ kind: "info", message: "Requesting mobile number update…" });
    try {
      const result = await requestMobileUpdate({ userid });
      setMobileStatus({
        kind: result?.success ? "success" : "error",
        message: result?.message || (result?.success ? "Mobile number updated!" : "Failed to update"),
      });
      setToast(result?.message || (result?.success ? "Mobile number updated!" : "Failed to update"));
    } catch (err) {
      const msg = err?.message || "Failed to update";
      setMobileStatus({ kind: "error", message: msg });
      setToast(msg);
    } finally {
      setIsMobileSubmitting(false);
    }
  };

  const handleMobileUpdateRef = useRef(handleMobileUpdate);
  useEffect(() => { handleMobileUpdateRef.current = handleMobileUpdate; });

  const handleCheckUpdate = async () => {
    try {
      setToast("Checking for updates…");
      const userid = localStorage.getItem("userId") || "";
      const mobile = localStorage.getItem("userPhone") || "";
      const payload = { userid, mobile, ip_address: "", device_type: "", mac_address: "", device_name: "", app_package: "com.fofi.fofiboxtv" };
      const fresh = await fetchAppVersion(payload, { force: true });
      if (fresh) {
        setAppVersionData(fresh);
        const current = "v2.0.0";
        const latest = fresh.appversion || current;
        if (latest === current || !fresh.updateavailable) {
          setToast("You're on the latest version");
        } else {
          setToast(`Update available: ${latest}`);
        }
      } else {
        setToast("Couldn't reach update server");
      }
    } catch {
      setToast("Couldn't reach update server");
    }
  };

  // ── Zoned focus engine ──────────────────────────────────────────────
  // Zones: "menu" (left sidebar items, vertical) | "check" (App Info Check button)
  //        | "support" (Help & Support: textarea + submit, vertical)
  //        | "mobile" (Update Mobile: Request Update button)
  const activeZoneRef = useRef("menu");
  const focusedMenuRef = useRef(0);
  const menuRefs = useRef([]);
  const checkBtnRef = useRef(null);
  const supportRefs = useRef([]); // [0]=textarea, [1]=submit
  const focusedSupportRef = useRef(0);
  const supportTextareaRef = useRef(null);
  const supportSubmitRef = useRef(null);
  const mobileBtnRef = useRef(null);
  const usersRefs = useRef([]); // [0]=input, [1]=submit
  const focusedUsersRef = useRef(0);
  const usersInputRef = useRef(null);
  const usersSubmitRef = useRef(null);
  const currentPageRef = useRef(currentPage);
  const showLogoutDialogRef = useRef(showLogoutDialog);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { showLogoutDialogRef.current = showLogoutDialog; }, [showLogoutDialog]);

  const applyMenuFocus = useCallback((newIdx) => {
    const oldIdx = focusedMenuRef.current;
    if (oldIdx !== newIdx) {
      const oldEl = menuRefs.current[oldIdx];
      if (oldEl) oldEl.removeAttribute("data-focused");
    }
    const newEl = menuRefs.current[newIdx];
    if (newEl) newEl.setAttribute("data-focused", "true");
    focusedMenuRef.current = newIdx;
  }, []);

  const applyCheckFocus = useCallback((focused) => {
    const el = checkBtnRef.current;
    if (!el) return;
    if (focused) el.setAttribute("data-focused", "true");
    else el.removeAttribute("data-focused");
  }, []);

  const applyMobileFocus = useCallback((focused) => {
    const el = mobileBtnRef.current;
    if (!el) return;
    if (focused) el.setAttribute("data-focused", "true");
    else el.removeAttribute("data-focused");
  }, []);

  const applySupportFocus = useCallback((newIdx) => {
    const oldIdx = focusedSupportRef.current;
    if (oldIdx !== newIdx) {
      const oldEl = supportRefs.current[oldIdx];
      if (oldEl) oldEl.removeAttribute("data-focused");
    }
    const newEl = supportRefs.current[newIdx];
    if (newEl) newEl.setAttribute("data-focused", "true");
    focusedSupportRef.current = newIdx;
  }, []);

  const clearSupportFocus = useCallback(() => {
    const el = supportRefs.current[focusedSupportRef.current];
    if (el) el.removeAttribute("data-focused");
  }, []);

  const applyUsersFocus = useCallback((newIdx) => {
    const oldIdx = focusedUsersRef.current;
    if (oldIdx !== newIdx) {
      const oldEl = usersRefs.current[oldIdx];
      if (oldEl) oldEl.removeAttribute("data-focused");
    }
    const newEl = usersRefs.current[newIdx];
    if (newEl) newEl.setAttribute("data-focused", "true");
    focusedUsersRef.current = newIdx;
  }, []);

  const clearUsersFocus = useCallback(() => {
    const el = usersRefs.current[focusedUsersRef.current];
    if (el) el.removeAttribute("data-focused");
  }, []);

  const switchZone = useCallback((newZone) => {
    const oldZone = activeZoneRef.current;
    if (oldZone === newZone) return;
    if (oldZone === "menu") {
      const el = menuRefs.current[focusedMenuRef.current];
      if (el) el.removeAttribute("data-focused");
    } else if (oldZone === "check") {
      applyCheckFocus(false);
    } else if (oldZone === "support") {
      clearSupportFocus();
    } else if (oldZone === "mobile") {
      applyMobileFocus(false);
    } else if (oldZone === "users") {
      clearUsersFocus();
    }
    activeZoneRef.current = newZone;
    if (newZone === "menu") {
      applyMenuFocus(focusedMenuRef.current);
    } else if (newZone === "check") {
      applyCheckFocus(true);
    } else if (newZone === "support") {
      applySupportFocus(focusedSupportRef.current);
    } else if (newZone === "mobile") {
      applyMobileFocus(true);
    } else if (newZone === "users") {
      applyUsersFocus(focusedUsersRef.current);
    }
  }, [applyMenuFocus, applyCheckFocus, applySupportFocus, clearSupportFocus, applyMobileFocus, applyUsersFocus, clearUsersFocus]);

  // Apply initial focus to menu on mount
  useEffect(() => {
    applyMenuFocus(0);
  }, [applyMenuFocus]);

  // If user navigates away from "about", clear check-zone focus and force back to menu
  useEffect(() => {
    if (currentPage !== "about" && activeZoneRef.current === "check") {
      switchZone("menu");
    }
  }, [currentPage, switchZone]);

  // If user navigates away from "mobile", clear mobile-zone focus and force back to menu
  useEffect(() => {
    if (currentPage !== "mobile" && activeZoneRef.current === "mobile") {
      switchZone("menu");
    }
  }, [currentPage, switchZone]);

  // If user navigates away from "support", clear textarea + force zone back to menu
  useEffect(() => {
    if (currentPage !== "support") {
      if (activeZoneRef.current === "support") switchZone("menu");
      // Reset support content + sub-zone index for next visit
      setSupportComment("");
      focusedSupportRef.current = 0;
    }
  }, [currentPage, switchZone]);

  // If user navigates away from "users", clear input + force zone back to menu
  useEffect(() => {
    if (currentPage !== "users") {
      if (activeZoneRef.current === "users") switchZone("menu");
      setUsersMobile("");
      focusedUsersRef.current = 0;
    }
  }, [currentPage, switchZone]);

  // ── Help & Support — focus textarea + open webOS keyboard ─────────────
  const focusSupportTextarea = useCallback(() => {
    try {
      supportTextareaRef.current?.focus();
    } catch { /* ignore */ }
    try {
      if (window.webOS && window.webOS.keyboard && typeof window.webOS.keyboard.show === "function") {
        window.webOS.keyboard.show();
      }
    } catch { /* ignore */ }
  }, []);

  // ── Help & Support — submit handler ────────────────────────────────────
  const handleSupportSubmit = useCallback(async () => {
    const userid = localStorage.getItem("userId") || "";
    const mobile = localStorage.getItem("userPhone") || "";
    const comment = (supportComment || "").trim();
    if (!comment) {
      setToast("Please enter a message");
      return;
    }
    if (!userid || !mobile) {
      setToast("Missing user details — please re-login");
      return;
    }
    const res = await submitTicket({ userid, mobile, comment });
    if (res?.success) {
      setSupportComment("");
      setToast("Ticket raised — we'll get back to you");
    } else {
      setToast(res?.message || "Failed to raise ticket");
    }
  }, [supportComment, submitTicket]);

  const handleSupportSubmitRef = useRef(handleSupportSubmit);
  useEffect(() => { handleSupportSubmitRef.current = handleSupportSubmit; }, [handleSupportSubmit]);

  // ── Manage Users — focus input + open webOS keyboard ────────────────────
  const focusUsersInput = useCallback(() => {
    try {
      usersInputRef.current?.focus();
    } catch { /* ignore */ }
    try {
      if (window.webOS && window.webOS.keyboard && typeof window.webOS.keyboard.show === "function") {
        window.webOS.keyboard.show();
      }
    } catch { /* ignore */ }
  }, []);

  // ── Manage Users — submit handler ──────────────────────────────────────
  const handleAddUserSubmit = useCallback(async () => {
    const userid = localStorage.getItem("userId") || "";
    const mac_address = (deviceInfo?.wiredMac && deviceInfo.wiredMac !== "Not available")
      ? deviceInfo.wiredMac
      : (deviceInfo?.wifiMac && deviceInfo.wifiMac !== "Not available")
        ? deviceInfo.wifiMac
        : "";
    const mobile = (usersMobile || "").trim();

    if (!userid) {
      setToast("Missing user ID — please re-login");
      return;
    }
    if (!mac_address) {
      setToast("MAC address unavailable — try again shortly");
      return;
    }
    if (!/^\d{10}$/.test(mobile)) {
      setToast("Enter a valid 10-digit mobile number");
      return;
    }

    const result = await submitAddUsers({ userid, mac_address, mobiles: [mobile] });
    setToast(result?.message || (result?.success ? "User added" : "Failed to add user"));
    if (result?.success) {
      setUsersMobile("");
    }
  }, [deviceInfo, usersMobile, submitAddUsers]);

  const handleAddUserSubmitRef = useRef(handleAddUserSubmit);
  useEffect(() => { handleAddUserSubmitRef.current = handleAddUserSubmit; }, [handleAddUserSubmit]);

  // Main capture-phase keydown handler — arrows + OK + BACK
  useEffect(() => {
    const handleKey = (e) => {
      // Pause when logout dialog is open — its own listener handles input
      if (showLogoutDialogRef.current) return;

      const kc = e.keyCode;
      const key = e.key;
      const isBack = kc === 461 || key === "GoBack" || key === "Back";
      const isEnter = kc === 13 || key === "Enter" || key === " ";
      const isArrow = kc >= 37 && kc <= 40;

      // If the support textarea is currently the active element (user is typing
      // via on-screen keyboard), BACK should just close the keyboard / blur — NOT
      // navigate home.  Mirror Feedback.jsx behavior.
      const taActive = document.activeElement === supportTextareaRef.current;
      const userInputActive = document.activeElement === usersInputRef.current;

      if (isBack) {
        if (taActive) {
          e.preventDefault();
          e.stopImmediatePropagation();
          supportTextareaRef.current?.blur();
          return;
        }
        if (userInputActive) {
          e.preventDefault();
          e.stopImmediatePropagation();
          usersInputRef.current?.blur();
          return;
        }
        // Custom BACK: settings → home (preventDefault so GlobalBackHandler doesn't double-fire)
        e.preventDefault();
        e.stopImmediatePropagation();
        navigate("/home");
        return;
      }

      // While typing in textarea or users input, let the keyboard own the keys
      if (taActive || userInputActive) return;

      if (!isArrow && !isEnter) return;

      const zone = activeZoneRef.current;

      if (zone === "menu") {
        if (kc === 38) { // UP
          e.preventDefault();
          const next = Math.max(0, focusedMenuRef.current - 1);
          if (next !== focusedMenuRef.current) applyMenuFocus(next);
        } else if (kc === 40) { // DOWN
          e.preventDefault();
          const next = Math.min(menuItems.length - 1, focusedMenuRef.current + 1);
          if (next !== focusedMenuRef.current) applyMenuFocus(next);
        } else if (kc === 39) { // RIGHT → Check (About) | Support textarea (Help & Support) | Mobile button (Update Mobile) | Users input (Manage Users)
          if (currentPageRef.current === "about" && checkBtnRef.current) {
            e.preventDefault();
            switchZone("check");
          } else if (currentPageRef.current === "support" && supportRefs.current[0]) {
            e.preventDefault();
            focusedSupportRef.current = 0;
            switchZone("support");
          } else if (currentPageRef.current === "mobile" && mobileBtnRef.current) {
            e.preventDefault();
            switchZone("mobile");
          } else if (currentPageRef.current === "users" && usersRefs.current[0]) {
            e.preventDefault();
            focusedUsersRef.current = 0;
            switchZone("users");
          }
        } else if (kc === 37) { // LEFT — no-op in menu zone
          e.preventDefault();
        } else if (isEnter) {
          e.preventDefault();
          const item = menuItems[focusedMenuRef.current];
          if (!item) return;
          if (item.id === "logout") setShowLogoutDialog(true);
          else setCurrentPage(item.id);
        }
      } else if (zone === "check") {
        if (kc === 37) { // LEFT → menu
          e.preventDefault();
          switchZone("menu");
        } else if (kc === 39 || kc === 38 || kc === 40) {
          // No further targets — eat the key
          e.preventDefault();
        } else if (isEnter) {
          e.preventDefault();
          handleCheckUpdate();
        }
      } else if (zone === "support") {
        if (kc === 37) { // LEFT → menu
          e.preventDefault();
          switchZone("menu");
        } else if (kc === 38) { // UP — textarea (idx 0) is the top
          e.preventDefault();
          if (focusedSupportRef.current !== 0) applySupportFocus(0);
        } else if (kc === 40) { // DOWN — submit (idx 1) is the bottom
          e.preventDefault();
          if (focusedSupportRef.current !== 1) applySupportFocus(1);
        } else if (kc === 39) { // RIGHT — eat (no further targets)
          e.preventDefault();
        } else if (isEnter) {
          e.preventDefault();
          if (focusedSupportRef.current === 0) {
            // OK on textarea → focus textarea + open webOS keyboard
            focusSupportTextarea();
          } else {
            // OK on submit
            handleSupportSubmitRef.current?.();
          }
        }
      } else if (zone === "mobile") {
        if (kc === 37) { // LEFT → menu
          e.preventDefault();
          switchZone("menu");
        } else if (kc === 39 || kc === 38 || kc === 40) {
          // No further targets — eat the key
          e.preventDefault();
        } else if (isEnter) {
          e.preventDefault();
          handleMobileUpdateRef.current?.();
        }
      } else if (zone === "users") {
        if (kc === 37) { // LEFT → menu
          e.preventDefault();
          switchZone("menu");
        } else if (kc === 38) { // UP — input (idx 0) is top
          e.preventDefault();
          if (focusedUsersRef.current !== 0) applyUsersFocus(0);
        } else if (kc === 40) { // DOWN — submit (idx 1) is bottom
          e.preventDefault();
          if (focusedUsersRef.current !== 1) applyUsersFocus(1);
        } else if (kc === 39) { // RIGHT — eat (no further targets)
          e.preventDefault();
        } else if (isEnter) {
          e.preventDefault();
          if (focusedUsersRef.current === 0) {
            // OK on input → focus input + open webOS keyboard
            focusUsersInput();
          } else {
            // OK on submit
            handleAddUserSubmitRef.current?.();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
    // handleCheckUpdate is referenced via closure each call — but listener is registered once.
    // We deliberately keep deps minimal; the handler reads refs for mutable state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyMenuFocus, applySupportFocus, applyUsersFocus, focusSupportTextarea, focusUsersInput, switchZone, navigate]);

  // ── Logout dialog focus trap ────────────────────────────────────────
  const dialogBtnRefs = useRef([]); // [0] = Cancel, [1] = Logout
  const dialogFocusedRef = useRef(0);

  const applyDialogFocus = useCallback((newIdx) => {
    const oldIdx = dialogFocusedRef.current;
    if (oldIdx !== newIdx) {
      const oldEl = dialogBtnRefs.current[oldIdx];
      if (oldEl) oldEl.removeAttribute("data-focused");
    }
    const newEl = dialogBtnRefs.current[newIdx];
    if (newEl) newEl.setAttribute("data-focused", "true");
    dialogFocusedRef.current = newIdx;
  }, []);

  useEffect(() => {
    if (!showLogoutDialog) return;

    // Default focus on Cancel
    dialogFocusedRef.current = 0;
    // Apply on next tick so refs are populated
    const t = setTimeout(() => applyDialogFocus(0), 0);

    const handleDialogKey = (e) => {
      const kc = e.keyCode;
      const key = e.key;
      const isBack = kc === 461 || key === "GoBack" || key === "Back";
      const isEnter = kc === 13 || key === "Enter" || key === " ";

      if (isBack) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setShowLogoutDialog(false);
        return;
      }
      if (kc === 37) { // LEFT → Cancel
        e.preventDefault();
        e.stopImmediatePropagation();
        if (dialogFocusedRef.current !== 0) applyDialogFocus(0);
      } else if (kc === 39) { // RIGHT → Logout
        e.preventDefault();
        e.stopImmediatePropagation();
        if (dialogFocusedRef.current !== 1) applyDialogFocus(1);
      } else if (isEnter) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (dialogFocusedRef.current === 0) setShowLogoutDialog(false);
        else handleLogout();
      } else if (kc >= 37 && kc <= 40) {
        // Eat any other arrow keys so they don't bleed through
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };

    window.addEventListener("keydown", handleDialogKey, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", handleDialogKey, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLogoutDialog]);

  const versionLoading = versionCache?.[`${localStorage.getItem("userId") || ""}|${localStorage.getItem("userPhone") || ""}|com.fofi.fofiboxtv`]?.isLoading;

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", backgroundColor: "#000", color: "#fff", padding: "40px", gap: "32px", fontFamily: '"Roboto","Helvetica","Arial",sans-serif', letterSpacing: "0.3px", position: "relative" }}>

      {toast && <Toast message={toast} onDone={() => setToast("")} />}

      {/* BACK BUTTON */}
      <button onClick={() => navigate("/home")} style={{ position: "absolute", top: "24px", left: "36px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", color: "#fff", fontSize: "20px", fontWeight: 600, background: "none", border: "none" }}>
        <ArrowBackIcon /> Back
      </button>

      {/* LEFT SIDEBAR MENU */}
      <div style={{ width: "320px", display: "flex", flexDirection: "column", border: "2px solid rgba(255,255,255,0.25)", borderRadius: "18px", padding: "24px", marginTop: "80px", pointerEvents: showLogoutDialog ? "none" : "auto" }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, width: "100%" }}>
          {menuItems.map((item, index) => {
            const isActive = currentPage === item.id;
            return (
              <li key={item.id}>
                <button
                  ref={(el) => { menuRefs.current[index] = el; }}
                  tabIndex={-1}
                  className="focusable-settings-item"
                  data-logout={item.id === "logout" ? "true" : undefined}
                  onClick={() => {
                    activeZoneRef.current = "menu";
                    applyMenuFocus(index);
                    if (item.id === "logout") setShowLogoutDialog(true);
                    else setCurrentPage(item.id);
                  }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", borderRadius: "14px", backgroundColor: item.id === "logout" ? (isActive ? "rgba(244,67,54,0.15)" : "transparent") : (isActive ? "rgba(255,255,255,0.12)" : "transparent"), border: item.id === "logout" ? "2px solid rgba(244,67,54,0.5)" : "2px solid transparent", padding: "20px", color: item.id === "logout" ? "#f44336" : "#fff", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ color: item.id === "logout" ? "#f44336" : "#fff" }}>{item.icon}</span>
                  <span style={{ fontSize: "20px", fontWeight: 600 }}>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, border: "2px solid rgba(255,255,255,0.25)", borderRadius: "18px", padding: "48px", marginTop: "80px", overflowY: "auto", pointerEvents: showLogoutDialog ? "none" : "auto" }}>

        {/* ABOUT APP */}
        {currentPage === "about" && (
          <div>
            <p style={{ fontSize: "36px", fontWeight: 700, marginBottom: "12px", lineHeight: 1.1 }}>About App</p>
            <p style={{ fontSize: "20px", color: "rgba(255,255,255,0.65)", marginBottom: "40px" }}>Learn information about our app</p>

            <div style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: "14px", padding: "32px", marginBottom: "24px" }}>
              <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.65)", marginBottom: "8px" }}>Software Version</p>
              {versionLoading ? <Spinner size={24} /> : <p style={{ fontSize: "22px", fontWeight: 600, margin: 0 }}>{appVersionData?.appversion || "v2.1.0 - Release"}</p>}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: "14px", padding: "32px" }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "22px", fontWeight: 600, margin: 0 }}>Software Updates</p>
                <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.65)", marginTop: "6px", margin: "6px 0 0" }}>Your App software is up to date</p>
              </div>
              <button
                ref={checkBtnRef}
                tabIndex={-1}
                className="focusable-check-btn"
                onClick={() => {
                  activeZoneRef.current = "check";
                  applyCheckFocus(true);
                  // Clear menu focus when clicking
                  const menuEl = menuRefs.current[focusedMenuRef.current];
                  if (menuEl) menuEl.removeAttribute("data-focused");
                  handleCheckUpdate();
                }}
                style={{ border: "2px solid rgba(255,255,255,0.4)", color: "#fff", backgroundColor: "transparent", fontSize: "18px", fontWeight: 600, padding: "12px 32px", marginLeft: "24px", borderRadius: "8px", cursor: "pointer" }}>Check</button>
            </div>
          </div>
        )}

        {/* LOGOUT PAGE */}
        {currentPage === "logout" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "32px" }}>
            <WarningIcon />
            <p style={{ fontSize: "36px", fontWeight: 700 }}>Logout</p>
            <p style={{ fontSize: "20px", color: "rgba(255,255,255,0.65)", textAlign: "center", maxWidth: "420px" }}>Are you sure you want to log out of your BBNL IPTV account?</p>
            <div style={{ display: "flex", gap: "24px", marginTop: "16px" }}>
              <button onClick={() => setCurrentPage("about")} style={{ border: "2px solid rgba(255,255,255,0.4)", color: "#fff", backgroundColor: "transparent", fontSize: "18px", fontWeight: 600, padding: "12px 40px", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => setShowLogoutDialog(true)} style={{ backgroundColor: "#f44336", color: "#fff", border: "none", fontSize: "18px", fontWeight: 600, padding: "12px 40px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <LogoutIcon /> Logout
              </button>
            </div>
          </div>
        )}

        {/* DEVICE INFO */}
        {currentPage === "device" && (
          <div>
            <p style={{ fontSize: "36px", fontWeight: 700, marginBottom: "12px", lineHeight: 1.1 }}>Device Info</p>
            <p style={{ fontSize: "20px", color: "rgba(255,255,255,0.65)", marginBottom: "40px" }}>View your device network and identification information</p>

            <div style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: "14px", padding: "28px 32px", marginBottom: "24px" }}>
              <p style={{ fontSize: "40px", fontWeight: 700, marginBottom: "16px" }}>TV Information</p>
              <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", rowGap: "18px", columnGap: "16px" }}>
                {[["TV Model Name", deviceInfo.modelName], ["Device ID", deviceInfo.deviceId], ["Connection Type", deviceInfo.connectionType || "Unknown"]].map(([label, value]) => (
                  <>
                    <p key={`l-${label}`} style={{ fontSize: "32px", color: "rgba(255,255,255,0.55)", fontWeight: 600, margin: 0 }}>{label}</p>
                    <p key={`v-${label}`} style={{ fontSize: "32px", fontWeight: 700, margin: 0 }}>{deviceInfo.loading ? <Spinner size={24} /> : (value || "Not available")}</p>
                  </>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: "14px", padding: "28px 32px" }}>
              <p style={{ fontSize: "40px", fontWeight: 700, marginBottom: "16px" }}>Network Information</p>
              <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", rowGap: "18px", columnGap: "16px" }}>
                {[["IP v4 Address", deviceInfo.publicIPv4], ["IP v6 Address", deviceInfo.publicIPv6]].map(([label, value]) => (
                  <>
                    <p key={`l-${label}`} style={{ fontSize: "32px", color: "rgba(255,255,255,0.55)", fontWeight: 600, margin: 0 }}>{label}</p>
                    <p key={`v-${label}`} style={{ fontSize: "32px", fontWeight: 700, margin: 0 }}>{deviceInfo.loading ? <Spinner size={24} /> : (value || "Not available")}</p>
                  </>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ACCOUNT INFO */}
        {currentPage === "account" && (
          <div>
            <p style={{ fontSize: "36px", fontWeight: 700, marginBottom: "12px", lineHeight: 1.1 }}>Account Info</p>
            <p style={{ fontSize: "20px", color: "rgba(255,255,255,0.65)", marginBottom: "40px" }}>View your subscription account and contact details</p>

            <div style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: "14px", padding: "28px 32px" }}>
              <p style={{ fontSize: "40px", fontWeight: 700, marginBottom: "16px" }}>Customer Details</p>
              <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", rowGap: "18px", columnGap: "16px" }}>
                {[
                  ["Name", [customerData?.fname, customerData?.lname].filter(Boolean).join(" ").trim()],
                  ["User ID", customerData?.userid],
                  ["Mobile", customerData?.mobile],
                  ["Email", customerData?.email],
                  ["User Type", customerData?.usertype],
                  ["Operator ID", customerData?.op_id],
                  ["Provider", customerData?.provider_compname || customerData?.provider],
                  ["Address", customerData?.address],
                ].map(([label, value]) => (
                  <>
                    <p key={`l-${label}`} style={{ fontSize: "32px", color: "rgba(255,255,255,0.55)", fontWeight: 600, margin: 0 }}>{label}</p>
                    <p key={`v-${label}`} style={{ fontSize: "32px", fontWeight: 700, margin: 0 }}>{customerLoading && !customerData ? <Spinner size={24} /> : (value || "Not available")}</p>
                  </>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EXPIRING CHANNELS */}
        {currentPage === "expiring" && (
          <div>
            <p style={{ fontSize: "36px", fontWeight: 700, marginBottom: "12px", lineHeight: 1.1 }}>Expiring Channels</p>
            <p style={{ fontSize: "20px", color: "rgba(255,255,255,0.65)", marginBottom: "40px" }}>Channels nearing expiry on your subscription</p>

            {expiringLoading && expiringList.length === 0 ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "48px 0" }}>
                <Spinner size={24} />
              </div>
            ) : expiringList.length === 0 ? (
              <div style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: "14px", padding: "20px" }}>
                <p style={{ fontSize: "20px", color: "rgba(255,255,255,0.75)", margin: 0 }}>No channels are expiring soon.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", maxHeight: "70vh" }}>
                {expiringList.map((ch, idx) => {
                  const chid = ch?.chid ?? ch?.channelid ?? idx;
                  const title = ch?.chtitle || ch?.channeltitle || "Channel";
                  const price = ch?.chprice;
                  const logo = ch?.chlogo;
                  const expiry = ch?.expirydate;
                  return (
                    <div key={`exp-${chid}-${idx}`} style={{ display: "flex", alignItems: "center", gap: "20px", backgroundColor: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: "14px", padding: "20px" }}>
                      {logo ? (
                        <img src={logo} alt="" style={{ width: "60px", height: "60px", borderRadius: "10px", objectFit: "cover", flexShrink: 0, backgroundColor: "rgba(255,255,255,0.08)" }} />
                      ) : (
                        <div style={{ width: "60px", height: "60px", borderRadius: "10px", backgroundColor: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "22px", fontWeight: 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</p>
                        {price !== undefined && price !== null && String(price).trim() !== "" && (
                          <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.65)", margin: "6px 0 0" }}>{`₹${price}`}</p>
                        )}
                      </div>
                      {expiry ? (
                        <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.75)", margin: 0, flexShrink: 0 }}>{`Expires ${expiry}`}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* HELP & SUPPORT */}
        {currentPage === "support" && (
          <div>
            <p style={{ fontSize: "36px", fontWeight: 700, marginBottom: "12px", lineHeight: 1.1 }}>Help & Support</p>
            <p style={{ fontSize: "20px", color: "rgba(255,255,255,0.65)", marginBottom: "40px" }}>Tell us about an issue</p>

            <div style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: "14px", padding: "28px 32px", maxWidth: "700px" }}>
              <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.65)", marginBottom: "12px" }}>Describe your issue</p>
              <textarea
                ref={(el) => { supportRefs.current[0] = el; supportTextareaRef.current = el; }}
                tabIndex={-1}
                className="focusable-support-textarea"
                value={supportComment}
                onChange={(e) => setSupportComment(e.target.value)}
                onFocus={() => {
                  try {
                    if (window.webOS && window.webOS.keyboard && typeof window.webOS.keyboard.show === "function") {
                      window.webOS.keyboard.show();
                    }
                  } catch { /* ignore */ }
                }}
                onClick={() => {
                  if (activeZoneRef.current !== "support") {
                    // Clear menu focus if leaving menu zone
                    const menuEl = menuRefs.current[focusedMenuRef.current];
                    if (menuEl) menuEl.removeAttribute("data-focused");
                    activeZoneRef.current = "support";
                  }
                  applySupportFocus(0);
                }}
                placeholder="Type your message here..."
                style={{
                  width: "100%",
                  minHeight: "160px",
                  color: "#fff",
                  background: "#1a1a1a",
                  borderRadius: "10px",
                  fontSize: "18px",
                  outline: "none",
                  border: "1px solid rgba(255,255,255,0.6)",
                  padding: "14px",
                  boxSizing: "border-box",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
                <button
                  ref={(el) => { supportRefs.current[1] = el; supportSubmitRef.current = el; }}
                  tabIndex={-1}
                  className="focusable-support-submit"
                  disabled={isTicketSubmitting}
                  onClick={() => {
                    if (activeZoneRef.current !== "support") {
                      const menuEl = menuRefs.current[focusedMenuRef.current];
                      if (menuEl) menuEl.removeAttribute("data-focused");
                      activeZoneRef.current = "support";
                    }
                    applySupportFocus(1);
                    handleSupportSubmit();
                  }}
                  style={{
                    border: "2px solid rgba(255,255,255,0.4)",
                    color: "#fff",
                    backgroundColor: "transparent",
                    fontSize: "18px",
                    fontWeight: 600,
                    padding: "12px 32px",
                    borderRadius: "8px",
                    cursor: isTicketSubmitting ? "not-allowed" : "pointer",
                    opacity: isTicketSubmitting ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}>
                  {isTicketSubmitting && <Spinner size={18} />}
                  {isTicketSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* UPDATE MOBILE NUMBER */}
        {currentPage === "mobile" && (
          <div>
            <p style={{ fontSize: "36px", fontWeight: 700, marginBottom: "12px", lineHeight: 1.1 }}>Update Mobile Number</p>
            <p style={{ fontSize: "20px", color: "rgba(255,255,255,0.65)", marginBottom: "40px" }}>Request a change to your registered mobile number</p>

            <div style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: "14px", padding: "32px", maxWidth: "700px" }}>
              <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.65)", marginBottom: "8px" }}>Current Mobile Number</p>
              <p style={{ fontSize: "26px", fontWeight: 700, margin: "0 0 28px" }}>{localStorage.getItem("userPhone") || "Not available"}</p>

              <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                <button
                  ref={mobileBtnRef}
                  tabIndex={-1}
                  className="focusable-mobile-update-btn"
                  disabled={isMobileSubmitting}
                  onClick={() => {
                    if (isMobileSubmitting) return;
                    activeZoneRef.current = "mobile";
                    applyMobileFocus(true);
                    // Clear menu focus when clicking
                    const menuEl = menuRefs.current[focusedMenuRef.current];
                    if (menuEl) menuEl.removeAttribute("data-focused");
                    handleMobileUpdate();
                  }}
                  style={{
                    border: "2px solid rgba(255,255,255,0.4)",
                    color: "#fff",
                    backgroundColor: "transparent",
                    fontSize: "18px",
                    fontWeight: 600,
                    padding: "12px 32px",
                    borderRadius: "8px",
                    cursor: isMobileSubmitting ? "not-allowed" : "pointer",
                    opacity: isMobileSubmitting ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}>
                  {isMobileSubmitting && <Spinner size={18} />}
                  {isMobileSubmitting ? "Requesting…" : "Request Update"}
                </button>

                {mobileStatus.message && (
                  <p style={{
                    fontSize: "18px",
                    margin: 0,
                    color: mobileStatus.kind === "success"
                      ? "#4caf50"
                      : mobileStatus.kind === "error"
                        ? "#f44336"
                        : "rgba(255,255,255,0.75)",
                  }}>
                    {mobileStatus.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MANAGE USERS */}
        {currentPage === "users" && (
          <div>
            <p style={{ fontSize: "36px", fontWeight: 700, marginBottom: "12px", lineHeight: 1.1 }}>Manage Users</p>
            <p style={{ fontSize: "20px", color: "rgba(255,255,255,0.65)", marginBottom: "40px" }}>Add additional users to your subscription</p>

            <div style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: "14px", padding: "28px 32px", maxWidth: "700px", marginBottom: "24px" }}>
              <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.65)", marginBottom: "12px" }}>New user mobile number</p>
              <input
                ref={(el) => { usersRefs.current[0] = el; usersInputRef.current = el; }}
                tabIndex={-1}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                className="focusable-users-input"
                value={usersMobile}
                onChange={(e) => {
                  // restrict to digits only
                  const digits = (e.target.value || "").replace(/\D/g, "").slice(0, 10);
                  setUsersMobile(digits);
                }}
                onFocus={() => {
                  try {
                    if (window.webOS && window.webOS.keyboard && typeof window.webOS.keyboard.show === "function") {
                      window.webOS.keyboard.show();
                    }
                  } catch { /* ignore */ }
                }}
                onClick={() => {
                  if (activeZoneRef.current !== "users") {
                    const menuEl = menuRefs.current[focusedMenuRef.current];
                    if (menuEl) menuEl.removeAttribute("data-focused");
                    activeZoneRef.current = "users";
                  }
                  applyUsersFocus(0);
                }}
                placeholder="10-digit mobile number"
                style={{
                  width: "100%",
                  color: "#fff",
                  background: "#1a1a1a",
                  borderRadius: "10px",
                  fontSize: "20px",
                  outline: "none",
                  border: "1px solid rgba(255,255,255,0.6)",
                  padding: "14px",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  letterSpacing: "1px",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
                <button
                  ref={(el) => { usersRefs.current[1] = el; usersSubmitRef.current = el; }}
                  tabIndex={-1}
                  className="focusable-users-submit"
                  disabled={isUsersSubmitting || usersMobile.length !== 10}
                  onClick={() => {
                    if (isUsersSubmitting || usersMobile.length !== 10) return;
                    if (activeZoneRef.current !== "users") {
                      const menuEl = menuRefs.current[focusedMenuRef.current];
                      if (menuEl) menuEl.removeAttribute("data-focused");
                      activeZoneRef.current = "users";
                    }
                    applyUsersFocus(1);
                    handleAddUserSubmit();
                  }}
                  style={{
                    border: "2px solid rgba(255,255,255,0.4)",
                    color: "#fff",
                    backgroundColor: "transparent",
                    fontSize: "18px",
                    fontWeight: 600,
                    padding: "12px 32px",
                    borderRadius: "8px",
                    cursor: (isUsersSubmitting || usersMobile.length !== 10) ? "not-allowed" : "pointer",
                    opacity: (isUsersSubmitting || usersMobile.length !== 10) ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}>
                  {isUsersSubmitting && <Spinner size={18} />}
                  {isUsersSubmitting ? "Adding..." : "Add User"}
                </button>
              </div>
            </div>

            {Array.isArray(usersLastResults) && usersLastResults.length > 0 && (
              <div style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: "14px", padding: "28px 32px", maxWidth: "700px" }}>
                <p style={{ fontSize: "22px", fontWeight: 700, marginBottom: "16px" }}>Last Submission</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {usersLastResults.map((row, idx) => {
                    const mob = row?.mobileno || row?.mobile || "";
                    const avl = (row?.avl || "").toString();
                    const isAlready = avl === "true";
                    const label = isAlready ? "Already a user" : "✓ Added";
                    const color = isAlready ? "#ffb300" : "#4caf50";
                    return (
                      <div key={`u-${mob}-${idx}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <p style={{ fontSize: "20px", fontWeight: 600, margin: 0 }}>{mob || "—"}</p>
                        <p style={{ fontSize: "18px", fontWeight: 600, margin: 0, color }}>{label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* LOGOUT CONFIRMATION DIALOG */}
      {showLogoutDialog && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ backgroundColor: "#1a1a2e", border: "2px solid rgba(244,67,54,0.4)", borderRadius: "18px", color: "#fff", padding: "32px", minWidth: "420px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "26px", fontWeight: 700, marginBottom: "8px" }}>
              <WarningSmallIcon /> Confirm Logout
            </div>
            <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.75)", lineHeight: 1.6, marginBottom: "24px" }}>
              You will be signed out of your BBNL IPTV account. All local session data will be cleared.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px" }}>
              <button
                ref={(el) => { dialogBtnRefs.current[0] = el; }}
                tabIndex={-1}
                className="focusable-dialog-cancel"
                onClick={() => setShowLogoutDialog(false)}
                style={{ border: "2px solid rgba(255,255,255,0.35)", color: "#fff", backgroundColor: "transparent", fontSize: "16px", fontWeight: 600, padding: "10px 32px", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
              <button
                ref={(el) => { dialogBtnRefs.current[1] = el; }}
                tabIndex={-1}
                className="focusable-dialog-logout"
                onClick={handleLogout}
                style={{ backgroundColor: "#f44336", color: "#fff", border: "none", fontSize: "16px", fontWeight: 600, padding: "10px 32px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <LogoutIcon /> Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Setting;
