// server.js
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const REDIRECT_URI = process.env.GITHUB_REDIRECT_URI; // e.g., https://your-oauth-server.vercel.app/callback
const SITE_URL = process.env.SITE_URL; // e.g., https://your-site.vercel.app

// Health check
app.get("/", (_, res) => res.send("Decap CMS OAuth server running"));

// Step 1: start OAuth
app.get("/oauth/github", (_, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo&state=default`;
  res.redirect(url);
});

// Step 2: GitHub callback
app.get("/oauth/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("No code provided");

  try {
    // Exchange code for access token
    const tokenResp = await axios.post(
      "https://github.com/login/oauth/access_token",
      { client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code, redirect_uri: REDIRECT_URI },
      { headers: { Accept: "application/json" } }
    );

    const token = tokenResp.data.access_token;
    if (!token) throw new Error("No access token received");

    // Redirect to CMS site to deliver token from same origin
    res.send(`
      <!DOCTYPE html>
      <html>
      <body>
      <script>
        window.location = "${SITE_URL}/admin/oauth.html?access_token=${token}";
      </script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("OAuth error");
  }
});

app.listen(PORT, () => console.log(`OAuth server running on port ${PORT}`));
