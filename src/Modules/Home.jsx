import { Box } from "@mui/material";

import Header from "../Atomic-Common-Componenets/Headerbar";
// import OttViews from "../Atomic-Module-Componenets/Home-Modules/OttViews";
import ChannelsView from "../Atomic-Module-Componenets/Home-Modules/ChannelsView";
import HomeAds from "../Atomic-Module-Componenets/Home-Modules/HomeAds";
import SidebarGlass from "./HomeSidebar";

const Home = () => {
  return (
    <Box
      sx={{
        bgcolor: "#000",
        minHeight: "100vh",
        color: "#fff",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
      }}
    >
      <Box
        sx={{
          flex: "0 0 auto",
        }}
      >
        <SidebarGlass />
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          width: "100%",
        }}
      >
        <Header />

        <Box
          sx={{
            width: "100%",
            pl: "9rem",
            mt: 0,
            mb: 0,
            pb: 0,
          }}
        >
          <Box sx={{ mt: "2rem" }}>
            <HomeAds/>
          </Box>
          {/* <OttViews /> */}
          <ChannelsView />
        </Box>
      </Box>
    </Box>
  );
};

export default Home;