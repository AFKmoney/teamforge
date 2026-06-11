/**
 * TeamForge IDE — Splash Screen
 *
 * Displayed while the Next.js server is starting up.
 */

const { BrowserWindow } = require('electron')

function createSplashScreen() {
  const splash = new BrowserWindow({
    width: 500,
    height: 350,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
  })

  splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 500px;
          height: 350px;
          background: #0d0d0d;
          border-radius: 12px;
          border: 1px solid rgba(0, 230, 118, 0.15);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          overflow: hidden;
          position: relative;
        }
        .glow {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0, 230, 118, 0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .logo {
          font-size: 56px;
          font-weight: 900;
          color: #00e676;
          letter-spacing: -3px;
          margin-bottom: 4px;
          text-shadow: 0 0 30px rgba(0, 230, 118, 0.3);
        }
        .subtitle {
          font-size: 18px;
          color: #888888;
          letter-spacing: 6px;
          font-weight: 600;
          margin-bottom: 32px;
        }
        .loader {
          width: 200px;
          height: 3px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 16px;
        }
        .loader-bar {
          height: 100%;
          background: linear-gradient(90deg, #00e676, #69f0ae);
          border-radius: 2px;
          animation: load 2.5s ease-in-out infinite;
        }
        @keyframes load {
          0% { width: 0%; margin-left: 0; }
          50% { width: 70%; margin-left: 15%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .status {
          font-size: 11px;
          color: #666;
          letter-spacing: 1px;
        }
        .dots::after {
          content: '';
          animation: dots 1.5s steps(4, end) infinite;
        }
        @keyframes dots {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
        }
        .version {
          position: absolute;
          bottom: 20px;
          font-size: 10px;
          color: #444;
        }
      </style>
    </head>
    <body>
      <div class="glow"></div>
      <div class="logo">TF</div>
      <div class="subtitle">IDE</div>
      <div class="loader"><div class="loader-bar"></div></div>
      <div class="status">Initializing TeamForge<span class="dots"></span></div>
      <div class="version">v1.0.0 — Autonomous AI Development</div>
    </body>
    </html>
  `)}`)

  return splash
}

module.exports = { createSplashScreen }
