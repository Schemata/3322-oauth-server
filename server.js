const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Environment variables
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const REDIRECT_URI = process.env.GITHUB_REDIRECT_URI;
const SITE_URL = process.env.SITE_URL;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Decap CMS OAuth Server',
    endpoints: ['/oauth/github', '/oauth/callback']
  });
});

// GitHub OAuth initiation
app.get('/oauth/github', (req, res) => {
  const authURL = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo&state=${req.query.state || 'default'}`;
  res.redirect(authURL);
});

// GitHub OAuth callback
app.get('/oauth/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code not found');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      redirect_uri: REDIRECT_URI
    }, {
      headers: { Accept: 'application/json' }
    });

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      throw new Error('No access token received');
    }

    // Return success page that will close the popup
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`
      <!DOCTYPE html>
      <html>
      <body>
      <script>
      (function() {
      
        function receiveMessage(e) {
          console.log("CMS acknowledged auth");
          window.close();
        }
      
        if (window.opener) {
          window.opener.postMessage(
            'authorization:github:success:{"token":"${access_token}","provider":"github"}',
            '*'
          );
        }
      
        window.close();
      
      })();
      </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Failed</title>
      </head>
      <body>
        <h1>Authorization failed</h1>
        <p>Error: ${error.message}</p>
        <script>
          if (window.opener) {
            window.opener.postMessage(
              'authorization:github:error:{"error":"${error.message}"}',
              '${SITE_URL}'
            );
            window.close();
          }
        </script>
      </body>
      </html>
    `);
  }
});

app.listen(port, () => {
  console.log(`OAuth server running on port ${port}`);
  console.log('Environment check:');
  console.log('- CLIENT_ID:', CLIENT_ID ? 'Set' : 'Missing');
  console.log('- CLIENT_SECRET:', CLIENT_SECRET ? 'Set' : 'Missing');
  console.log('- REDIRECT_URI:', REDIRECT_URI);
  console.log('- SITE_URL:', SITE_URL);
});
