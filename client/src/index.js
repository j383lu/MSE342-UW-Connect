import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import "./index.css";
import theme from "./components/App/Theme";
import App from "./components/App";
import Firebase, {FirebaseContext} from './components/Firebase';

const container = document.getElementById('root');
const root = createRoot(document.getElementById("root"));

root.render(
  <FirebaseContext.Provider value={new Firebase()}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </FirebaseContext.Provider>
);
