import { useNavigate } from "react-router-dom";
import { useEnhancedRemoteNavigation } from "./useMagicRemote";

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94zM12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
  </svg>
);

const Header = () => {
  const navigate = useNavigate();

  const headerItems = [
    { id: "search", type: "input" },
    { id: "settings", type: "button", action: () => navigate("/settings") },
  ];

  const { getItemProps } = useEnhancedRemoteNavigation(headerItems, {
    orientation: "horizontal", useMagicRemotePointer: true, focusThreshold: 120,
    onSelect: (index) => { if (index === 1) navigate("/settings"); },
  });

  return (
    <header style={{ backgroundColor: "#0a0a0a", borderBottom: "2px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: "16px", padding: "8px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", minWidth: "12rem" }}>
        <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", letterSpacing: "0.5px" }}>BBNL</span>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        <div
          {...getItemProps(0)}
          data-focus-id="header-search"
          className="focusable-input"
          style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: "9999px", padding: "0 24px", height: "3rem", width: "100%", maxWidth: "42rem", transition: "all 0.15s", outline: "none" }}
        >
          <span style={{ color: "rgba(255,255,255,0.5)", display: "flex" }}><SearchIcon /></span>
          <input placeholder="Search for movies, TV shows..." style={{ background: "none", border: "none", outline: "none", color: "#fff", fontSize: "1rem", width: "100%" }} aria-label="Search" />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <button
          {...getItemProps(1)}
          data-focus-id="header-settings"
          className="focusable-icon-button"
          onClick={() => navigate("/settings")}
          style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)", color: "#fff", width: "48px", height: "48px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s", outline: "none" }}
          aria-label="Settings"
        >
          <SettingsIcon />
        </button>
      </div>
    </header>
  );
};

export default Header;
