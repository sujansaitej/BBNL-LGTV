import React, { useState } from "react";
import { Box, Container, Drawer } from "@mui/material";

import Header from "../Atomic-Common-Componenets/Headerbar";
import OttViews from "../Atomic-Module-Componenets/Home-Modules/OttViews";
import ChannelsView from "../Atomic-Module-Componenets/Home-Modules/ChannelsView";
import HomeAds from "../Atomic-Module-Componenets/Home-Modules/HomeAds";
import SidebarGlass from "./HomeSidebar";

const Home = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Box bgcolor="#121212" minHeight="100vh" color="#fff">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <Drawer
        anchor="left"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: "transparent",
            boxShadow: "none",
            p: 2,
          },
        }}
      >
        <SidebarGlass />
      </Drawer>
      <Container sx={{ mt: 3, pb: 6 }}>
        <HomeAds />
        <OttViews />
        <ChannelsView />
      </Container>
    </Box>
  );
};

export default Home;
