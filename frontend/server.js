const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.url === '/health' || req.url === '/') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'frontend',
      message: 'Geulpi Frontend is running'
    }));
  } else {
    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Geulpi Calendar</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .status { color: #28a745; font-weight: bold; }
            .info { margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🗓️ Geulpi Calendar Service</h1>
            <p class="status">✅ Frontend service is running</p>
            <div class="info">
              <h3>Service Information</h3>
              <ul>
                <li><strong>Port:</strong> 3000</li>
                <li><strong>Status:</strong> Healthy</li>
                <li><strong>Backend API:</strong> http://localhost:8080</li>
                <li><strong>ML Server:</strong> http://localhost:8000</li>
              </ul>
            </div>
            <div class="info">
              <h3>Available Services</h3>
              <ul>
                <li><a href="http://localhost:8080/health">Backend Health Check</a></li>
                <li><a href="http://localhost:8000/health">ML Server Health Check</a></li>
              </ul>
            </div>
          </div>
        </body>
      </html>
    `);
  }
});

const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Frontend server running on port ${port}`);
});