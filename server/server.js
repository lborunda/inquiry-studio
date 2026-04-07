require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
const port = process.env.PORT || 8080;
//const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
const apiKey =
  process.env.GEMINI_API_KEY2 ||
  process.env.GEMINI_API_KEY ||
  process.env.API_KEY;
  
const externalApiBaseUrl = "https://generativelanguage.googleapis.com";

app.use(express.json({ limit: "50mb" }));

// Health
app.get("/test", (_req, res) => res.json({ ok: true }));

// CORS only for proxy
app.use("/api-proxy", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Gemini proxy
app.all("/api-proxy/*", async (req, res) => {
  if (!apiKey) return res.status(403).json({ error: "API key not set on server" });

  const targetPath = req.url.replace(/^\/api-proxy\//, "");
  const targetUrl = `${externalApiBaseUrl}/${targetPath}`;

  try {
    const r = await axios({
      method: req.method,
      url: targetUrl,
      headers: {
        "X-Goog-Api-Key": apiKey,
        ...(req.headers["content-type"] && { "Content-Type": req.headers["content-type"] }),
        Accept: "*/*",
      },
      data: req.body,
      timeout: 120000,
    });

    res.status(r.status);
    if (r.data) return res.send(r.data);
    return res.end();
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message, detail: e.response?.data });
  }
});

// Serve built frontend
const staticPath = path.join(__dirname, "dist");
app.use(express.static(staticPath));
app.get("*", (_req, res) => res.sendFile(path.join(staticPath, "index.html")));

app.listen(port, () => console.log(`✅ Inquiry server listening on ${port}`));