import React from "react";
import ReactDOM from "react-dom/client";
import "@fortawesome/fontawesome-free/css/all.css";
import App from "./App";
import "@picocss/pico/css/pico.min.css";



import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
      <App />
  </React.StrictMode>,
);

const express = require("express");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const app = express();

app.post("/csvfiles", upload.single("uploaded_file"), function (req, res, next) {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  res.send("File uploaded.");
} );