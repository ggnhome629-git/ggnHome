import React from "react";
import { createRoot } from "react-dom/client";
import { resolveApiBase } from "./apiBase.js";
import "./styles.css";

// The server address comes from Stashr, so it is resolved before the app (which reads it) is loaded.
resolveApiBase().finally(() => import("./App.jsx").then(({ default: App }) => createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>)));
