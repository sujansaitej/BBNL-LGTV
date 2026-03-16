import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDeviceInformation } from "../server/Deviceinformaction/LG-Devicesinformaction";
import useAppVersionStore from "../store/LogineOttp";
import { useEnhancedRemoteNavigation } from "../Remote/useMagicRemote";

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

const menuItems = [
  { id: "about", label: "About App", icon: <InfoIcon /> },
  { id: "device", label: "Device Info", icon: <InfoIcon /> },
  { id: "logout", label: "Logout", icon: <LogoutIcon /> },
];

const Setting = ({ onLogout }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState("about");
  const [appVersionData, setAppVersionData] = useState(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const { versionCache, fetchAppVersion } = useAppVersionStore();
  const deviceInfo = useDeviceInformation();

  const handleLogout = () => {
    if (onLogout) onLogout();
    else { localStorage.clear(); sessionStorage.clear(); }
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

  const { getItemProps } = useEnhancedRemoteNavigation(menuItems, {
    orientation: "vertical", useMagicRemotePointer: true, focusThreshold: 150,
    onSelect: (index) => {
      if (menuItems[index].id === "logout") setShowLogoutDialog(true);
      else setCurrentPage(menuItems[index].id);
    },
  });

  const versionLoading = versionCache?.[`${localStorage.getItem("userId") || ""}|${localStorage.getItem("userPhone") || ""}|com.fofi.fofiboxtv`]?.isLoading;

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", backgroundColor: "#000", color: "#fff", padding: "40px", gap: "32px", fontFamily: '"Roboto","Helvetica","Arial",sans-serif', letterSpacing: "0.3px", position: "relative" }}>

      {/* BACK BUTTON */}
      <button onClick={() => navigate("/home")} style={{ position: "absolute", top: "24px", left: "36px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", color: "#fff", fontSize: "20px", fontWeight: 600, background: "none", border: "none" }}>
        <ArrowBackIcon /> Back
      </button>

      {/* LEFT SIDEBAR MENU */}
      <div style={{ width: "320px", display: "flex", flexDirection: "column", border: "2px solid rgba(255,255,255,0.25)", borderRadius: "18px", padding: "24px", marginTop: "80px" }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, width: "100%" }}>
          {menuItems.map((item, index) => {
            const isActive = currentPage === item.id;
            return (
              <li key={item.id}>
                <button
                  {...getItemProps(index)}
                  className="focusable-settings-item"
                  data-logout={item.id === "logout" ? "true" : undefined}
                  onClick={() => { if (item.id === "logout") setShowLogoutDialog(true); else setCurrentPage(item.id); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (item.id === "logout") setShowLogoutDialog(true); else setCurrentPage(item.id); } }}
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
      <div style={{ flex: 1, border: "2px solid rgba(255,255,255,0.25)", borderRadius: "18px", padding: "48px", marginTop: "80px", overflowY: "auto" }}>

        {/* ABOUT APP */}
        {currentPage === "about" && (
          <div>
            <p style={{ fontSize: "36px", fontWeight: 700, marginBottom: "12px", lineHeight: 1.1 }}>About App</p>
            <p style={{ fontSize: "20px", color: "rgba(255,255,255,0.65)", marginBottom: "40px" }}>Learn information about our app</p>

            <div style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: "14px", padding: "32px", marginBottom: "24px" }}>
              <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.65)", marginBottom: "8px" }}>Software Version</p>
              {versionLoading ? <Spinner size={24} /> : <p style={{ fontSize: "22px", fontWeight: 600, margin: 0 }}>{appVersionData?.appversion || "v2.1.0 - Release"}</p>}
            </div>

            {appVersionData?.verchngmsg && (
              <div style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: "14px", padding: "32px", marginBottom: "24px" }}>
                <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.65)", marginBottom: "8px" }}>Version Message</p>
                <p style={{ fontSize: "20px", fontWeight: 500, color: "#4fc3f7", fontStyle: "italic", margin: 0 }}>{appVersionData.verchngmsg}</p>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: "14px", padding: "32px" }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "22px", fontWeight: 600, margin: 0 }}>Software Updates</p>
                <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.65)", marginTop: "6px", margin: "6px 0 0" }}>Your App software is up to date</p>
              </div>
              <button style={{ border: "2px solid rgba(255,255,255,0.4)", color: "#fff", backgroundColor: "transparent", fontSize: "18px", fontWeight: 600, padding: "12px 32px", marginLeft: "24px", borderRadius: "8px", cursor: "pointer" }}>Check</button>
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
              <button onClick={() => setShowLogoutDialog(false)} style={{ border: "2px solid rgba(255,255,255,0.35)", color: "#fff", backgroundColor: "transparent", fontSize: "16px", fontWeight: 600, padding: "10px 32px", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleLogout} style={{ backgroundColor: "#f44336", color: "#fff", border: "none", fontSize: "16px", fontWeight: 600, padding: "10px 32px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
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
