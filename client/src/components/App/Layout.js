import React from "react";
import { Grid } from "@mui/material";
import Navbar from "./Navbar";

function Layout({ children }) {
  return (
    <>
      <Navbar />

      {/* Page Content */}
      <Grid
        container
        justifyContent="center"
        sx={{ mt: 4 }}
      >
        <Grid item xs={11} md={8}>
          {children}
        </Grid>
      </Grid>
    </>
  );
}

export default Layout;