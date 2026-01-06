import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress, IconButton } from "@mui/material";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchIptvAds } from "../../Api/modules-api/HomeAdsApi";
import { useRemoteNavigation } from "../../Atomic-Common-Componenets/useRemoteNavigation";

const HomeAds = ({
  userid = localStorage.getItem("userId") || "testiser1",
  mobile = localStorage.getItem("userPhone") || "",
  ip_address = "",
  mac_address = "",
  adclient = "fofi",
  srctype = "image",
  displayarea = "homepage",
  displaytype = "multiple",
  preferForm = false,
}) => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);

  // Remote navigation for carousel buttons (Previous, Next)
  const { getItemProps } = useRemoteNavigation(2, {
    orientation: "horizontal",
    onSelect: (index) => {
      if (index === 0) {
        // Previous button
        setActive((p) => (p === 0 ? ads.length - 1 : p - 1));
      } else if (index === 1) {
        // Next button
        setActive((p) => (p + 1) % ads.length);
      }
    },
  });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError("");

    if (!mobile) {
      setError("Mobile number required. Please login again");
      setLoading(false);
      return;
    }

    const attempt = async (preferFormAttempt) => {
      try {
        const urls = await fetchIptvAds({
          userid,
          mobile,
          ip_address,
          mac_address,
          adclient,
          srctype,
          displayarea,
          displaytype,
          signal: controller.signal,
          preferForm: preferFormAttempt,
        });

        if (!cancelled) setAds(urls);
      } catch {
        if (!cancelled) setError("Failed to load ads");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    attempt(preferForm);
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return (
    <Box
      sx={{
        width: "100%",
        height: 400,
        borderRadius: "24px",
        overflow: "hidden",
        position: "relative",
        background: "#0a0a0a",
        mb: 6,
      }}
    >
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
          <CircularProgress sx={{ color: "#8bdcff" }} />
        </Box>
      )}

      {!loading && error && (
        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
          <Typography color="#aaa">{error}</Typography>
        </Box>
      )}

      {!loading &&
        ads.map((url, index) => (
          <Box
            key={index}
            sx={{
              position: "absolute",
              inset: 0,
              opacity: index === active ? 1 : 0,
              transition: "opacity .6s ease",
            }}
          >
            <img
              src={url}
              alt="ad"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </Box>
        ))}

      {ads.length > 1 && (
        <>
          <IconButton
            {...getItemProps(0)}
            onClick={() => setActive((p) => (p === 0 ? ads.length - 1 : p - 1))}
            sx={{
              position: "absolute",
              left: 18,
              top: "50%",
              transform: getItemProps(0)["data-focused"] ? "translateY(-50%) scale(1.2)" : "translateY(-50%)",
              background: getItemProps(0)["data-focused"] ? "rgba(102, 126, 234, 0.8)" : "rgba(0,0,0,.6)",
              border: getItemProps(0)["data-focused"] ? "2px solid #667eea" : "none",
            }}
          >
            <ChevronLeft color="#fff" />
          </IconButton>

          <IconButton
            {...getItemProps(1)}
            onClick={() => setActive((p) => (p + 1) % ads.length)}
            sx={{
              position: "absolute",
              right: 18,
              top: "50%",
              transform: getItemProps(1)["data-focused"] ? "translateY(-50%) scale(1.2)" : "translateY(-50%)",
              background: getItemProps(1)["data-focused"] ? "rgba(102, 126, 234, 0.8)" : "rgba(0,0,0,.6)",
              border: getItemProps(1)["data-focused"] ? "2px solid #667eea" : "none",
            }}
          >
            <ChevronRight color="#fff" />
          </IconButton>
        </>
      )}
    </Box>
  );
};

export default HomeAds;


























// import React, { useEffect, useState } from "react";
// import { Box, Typography, CircularProgress, IconButton } from "@mui/material";
// import { ChevronLeft, ChevronRight } from "lucide-react";
// import { fetchIptvAds } from "../../Api/modules-api/HomeAdsApi";

// const HomeAds = ({
//   userid = localStorage.getItem('userId') || process.env.REACT_APP_IPTV_USERID || "testiser1",
//   mobile = localStorage.getItem('userPhone') || process.env.REACT_APP_IPTV_MOBILE || "",
//   ip_address = process.env.REACT_APP_IPTV_IP_ADDRESS || "",
//   mac_address = process.env.REACT_APP_IPTV_MAC_ADDRESS || "",
//   adclient = process.env.REACT_APP_IPTV_ADCLIENT || "fofi",
//   srctype = process.env.REACT_APP_IPTV_SRCTYPE || "image",
//   displayarea = process.env.REACT_APP_IPTV_DISPLAYAREA || "homepage",
//   displaytype = process.env.REACT_APP_IPTV_DISPLAYTYPE || "multiple",
//   withCredentials = true,
//   preferForm = false,
// }) => {
//   const [ads, setAds] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [active, setActive] = useState(0);

//   useEffect(() => {
//     const controller = new AbortController();
//     let cancelled = false;
//     setLoading(true);
//     setError("");

//     if (!mobile) {
//       setError("Mobile number required. Please log in again.");
//       setLoading(false);
//       return () => controller.abort();
//     }

//     const attempt = async (preferFormAttempt) => {
//       try {
//         const urls = await fetchIptvAds({
//           userid,
//           mobile,
//           ip_address,
//           mac_address,
//           adclient,
//           srctype,
//           displayarea,
//           displaytype,
//           signal: controller.signal,
//           preferForm: preferFormAttempt,
//         });
//         if (!cancelled) {
//           console.log("[HomeAds] Received ad URLs:", urls);
//           setAds(urls);
//         }
//       } catch (e) {
//         const msg = e?.message || "";
//         if (!cancelled && /required details/i.test(msg) && !preferFormAttempt) {
//           console.log("[HomeAds] Retrying with form encoding...");
//           return attempt(true);
//         }
//         if (!cancelled && e?.name !== "CanceledError") {
//           console.error("[HomeAds] Error:", msg);
//           setError(msg || "Failed to load ads");
//         }
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     };

//     attempt(preferForm);

//     return () => {
//       cancelled = true;
//       controller.abort();
//     };
//   }, [userid, mobile, ip_address, mac_address, adclient, srctype, displayarea, displaytype, preferForm]);

//   // Auto-slide every 5 seconds
//   useEffect(() => {
//     if (ads.length > 1) {
//       const t = setInterval(
//         () => setActive((p) => (p + 1) % ads.length),
//         5000
//       );
//       return () => clearInterval(t);
//     }
//   }, [ads]);

//   const handlePrev = () => {
//     setActive((p) => (p === 0 ? ads.length - 1 : p - 1));
//   };

//   const handleNext = () => {
//     setActive((p) => (p + 1) % ads.length);
//   };

//   return (
//     <Box
//       sx={{
//         mt: 2,
//         borderRadius: 6,
//         overflow: "hidden",
//         height: 380,
//         position: "relative",
//         boxShadow: "0 24px 48px rgba(0,0,0,0.55)",
//         bgcolor: "#0a0a0a",
//       }}
//     >
//       {loading && (
//         <Box display="flex" justifyContent="center" alignItems="center" height="100%">
//           <CircularProgress size={28} sx={{ color: "#9adfff" }} />
//         </Box>
//       )}

//       {!loading && error && (
//         <Box display="flex" justifyContent="center" alignItems="center" height="100%" p={3}>
//           <Typography color="#bbb" fontSize={16}>
//             {error}
//           </Typography>
//         </Box>
//       )}

//       {!loading && !error && ads.length === 0 && (
//         <Box display="flex" justifyContent="center" alignItems="center" height="100%" p={3}>
//           <Typography color="#999" fontSize={16}>
//             No advertisements available
//           </Typography>
//         </Box>
//       )}

//       {!loading && !error && ads.length > 0 && (
//         <>
//           {/* Slider Container */}
//           <Box
//             sx={{
//               position: "relative",
//               width: "100%",
//               height: "100%",
//               overflow: "hidden",
//             }}
//           >
//             {ads.map((url, index) => (
//               <Box
//                 key={index}
//                 sx={{
//                   position: "absolute",
//                   top: 0,
//                   left: 0,
//                   width: "100%",
//                   height: "100%",
//                   opacity: index === active ? 1 : 0,
//                   transition: "opacity 0.6s ease-in-out",
//                   zIndex: index === active ? 1 : 0,
//                 }}
//               >
//                 {srctype === "video" ? (
//                   <video
//                     src={url}
//                     style={{ width: "100%", height: "100%", objectFit: "cover" }}
//                     autoPlay
//                     muted
//                     loop
//                     playsInline
//                   />
//                 ) : (
//                   <Box sx={{ width: "100%", height: "100%" }}>
//                     <Box
//                       sx={{
//                         width: "100%",
//                         height: "100%",
//                         backgroundImage: `url(${url})`,
//                         backgroundSize: "cover",
//                         backgroundPosition: "center",
//                       }}
//                     />
//                     <Box
//                       sx={{
//                         position: "absolute",
//                         inset: 0,
//                         background:
//                           "linear-gradient(120deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 60%)",
//                       }}
//                     />
//                   </Box>
//                 )}
//               </Box>
//             ))}
//           </Box>

//           {/* Navigation Arrows */}
//           {ads.length > 1 && (
//             <>
//               <IconButton
//                 onClick={handlePrev}
//                 sx={{
//                   position: "absolute",
//                   left: 16,
//                   top: "50%",
//                   transform: "translateY(-50%)",
//                   bgcolor: "rgba(0,0,0,0.5)",
//                   color: "#fff",
//                   zIndex: 10,
//                   "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
//                 }}
//               >
//                 <ChevronLeft size={28} />
//               </IconButton>
//               <IconButton
//                 onClick={handleNext}
//                 sx={{
//                   position: "absolute",
//                   right: 16,
//                   top: "50%",
//                   transform: "translateY(-50%)",
//                   bgcolor: "rgba(0,0,0,0.5)",
//                   color: "#fff",
//                   zIndex: 10,
//                   "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
//                 }}
//               >
//                 <ChevronRight size={28} />
//               </IconButton>
//             </>
//           )}

//           {/* Indicators */}
//           {ads.length > 1 && (
//             <Box
//               sx={{
//                 position: "absolute",
//                 bottom: 20,
//                 left: "50%",
//                 transform: "translateX(-50%)",
//                 display: "flex",
//                 gap: 1,
//                 zIndex: 10,
//               }}
//             >
//               {ads.map((_, index) => (
//                 <Box
//                   key={index}
//                   onClick={() => setActive(index)}
//                   sx={{
//                     width: index === active ? 28 : 8,
//                     height: 8,
//                     borderRadius: 4,
//                     bgcolor: index === active ? "#4bd2ff" : "rgba(255,255,255,0.5)",
//                     cursor: "pointer",
//                     transition: "all 0.3s ease",
//                   }}
//                 />
//               ))}
//             </Box>
//           )}

//           {/* Ad Label */}
//           <Box
//             sx={{
//               position: "absolute",
//               left: 16,
//               top: 16,
//               bgcolor: "rgba(0,0,0,0.65)",
//               border: "1px solid rgba(255,255,255,0.1)",
//               borderRadius: 2,
//               px: 1.5,
//               py: 0.5,
//               zIndex: 10,
//             }}
//           >
//             <Typography fontSize={12} color="#d6f4ff" fontWeight={500}>
//               Advertisement {ads.length > 1 ? `${active + 1}/${ads.length}` : ""}
//             </Typography>
//           </Box>
//         </>
//       )}
//     </Box>
//   );
// };

// export default HomeAds;
