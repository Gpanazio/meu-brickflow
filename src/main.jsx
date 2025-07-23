import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// ✅ Correto: código fora do JSX
import { getCurrentBoardData as globalGetCurrentBoardData } from "./utils/getCurrentBoardData";
window.getCurrentBoardData = globalGetCurrentBoardData;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
