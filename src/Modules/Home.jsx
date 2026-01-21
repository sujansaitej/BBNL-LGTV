import { Box, Drawer } from "@mui/material";

import Header from "../Atomic-Common-Componenets/Headerbar";
import OttViews from "../Atomic-Module-Componenets/Home-Modules/OttViews";
import ChannelsView from "../Atomic-Module-Componenets/Home-Modules/ChannelsView";
import HomeAds from "../Atomic-Module-Componenets/Home-Modules/HomeAds";
import SidebarGlass from "./HomeSidebar";
import { useTheme } from "../Atomic-Common-Componenets/TheamChange";

const Home = () => {
  const { theme } = useTheme();

  return (
    <Box
      sx={{
        bgcolor: theme.colors.background,
        minHeight: "100vh",
        color: theme.colors.text,
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Header/>

      <Drawer
        anchor="left"
        PaperProps={{
          sx: {
            bgcolor: "transparent",
            boxShadow: "none",
          },
        }}
      >
        <SidebarGlass />
      </Drawer>

      <Box
        sx={{
          width: "100%",
          maxWidth: "clamp(72rem, 92vw, 100rem)",
          mx: "auto",
          px: { xs: "1.5rem", sm: "2rem", md: "2.75rem" },
          mt: { xs: "1.5rem", md: "2rem" },
          pb: { xs: "4.5rem", md: "6rem" },
        }}
      >
        <HomeAds />
        <OttViews />
        <ChannelsView />
      </Box>
    </Box>
  );
};

export default Home;
