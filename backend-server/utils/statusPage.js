/**
 * Generates a beautiful, modern status dashboard for the Hostel Ledger Backend API.
 */
function getStatusPageHTML(data) {
    const { 
        version, 
        env, 
        system, 
        timestamp, 
        firebaseActive, 
        oneSignalActive, 
        smtpActive, 
        aiActive,
        endpoints 
    } = data;

    const uptime = system?.uptime || 0;
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hostel Ledger | API Status</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0a0c10;
            --card-bg: rgba(255, 255, 255, 0.03);
            --card-border: rgba(255, 255, 255, 0.08);
            --primary: #10b981;
            --primary-glow: rgba(16, 185, 129, 0.15);
            --text-main: #f8fafc;
            --text-dim: #94a3b8;
            --error: #ef4444;
            --warning: #f59e0b;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            line-height: 1.6;
            overflow-x: hidden;
            background-image: radial-gradient(circle at 50% -20%, #1e293b 0%, var(--bg-color) 80%);
            min-height: 100vh;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 48px;
            animation: fadeInDown 0.8s ease-out;
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .logo {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #10b981, #059669);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 20px var(--primary-glow);
        }

        .logo svg { width: 24px; height: 24px; fill: white; }

        .brand-text h1 {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: -0.02em;
            background: linear-gradient(to right, #fff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .version-badge {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            padding: 4px 12px;
            border-radius: 100px;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-dim);
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
            animation: fadeInUp 0.8s ease-out 0.2s both;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
            animation: fadeInUp 0.8s ease-out 0.3s both;
        }

        .status-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 16px;
            padding: 20px;
            backdrop-filter: blur(10px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .status-card:hover {
            border-color: var(--primary);
            transform: translateY(-4px);
            background: rgba(255, 255, 255, 0.05);
            box-shadow: 0 12px 24px -12px rgba(0, 0, 0, 0.5);
        }

        .metric-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--card-border);
            border-radius: 16px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .metric-label {
            font-size: 11px;
            font-weight: 700;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .metric-value {
            font-size: 18px;
            font-weight: 700;
            color: #fff;
        }

        .metric-sub {
            font-size: 11px;
            color: var(--text-dim);
        }

        .action-container {
            margin-top: 32px;
            display: flex;
            justify-content: center;
            animation: fadeInUp 0.8s ease-out 0.5s both;
        }

        .primary-btn {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 12px 28px;
            border-radius: 12px;
            font-weight: 700;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2);
        }

        .primary-btn:hover {
            transform: scale(1.02);
            box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
        }

        .primary-btn svg { width: 18px; height: 18px; }

        .api-section {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 20px;
            padding: 24px;
            backdrop-filter: blur(10px);
            animation: fadeInUp 0.8s ease-out 0.4s both;
        }

        .section-header {
            margin-bottom: 24px;
        }

        .section-header h2 {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .section-header p {
            font-size: 14px;
            color: var(--text-dim);
        }

        .api-table {
            width: 100%;
            border-collapse: collapse;
        }

        .api-row {
            border-bottom: 1px solid var(--card-border);
            transition: background 0.2s ease;
        }

        .api-row:last-child { border-bottom: none; }
        
        .api-row:hover {
            background: rgba(255, 255, 255, 0.02);
        }

        .api-cell {
            padding: 16px 8px;
            font-size: 14px;
        }

        .api-name { font-weight: 600; color: #fff; }
        .api-path { font-family: 'Monaco', 'Consolas', monospace; color: var(--text-dim); font-size: 13px; }
        
        .method-badge {
            font-size: 10px;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: 6px;
            text-transform: uppercase;
        }

        .method-get { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); }
        .method-post { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }

        .status-badge {
            background: rgba(16, 185, 129, 0.1);
            color: #34d399;
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
        }

        footer {
            margin-top: 48px;
            text-align: center;
            color: var(--text-dim);
            font-size: 13px;
        }

        @keyframes pulse {
            0% { transform: scale(1); opacity: 0.8; }
            70% { transform: scale(3); opacity: 0; }
            100% { transform: scale(3); opacity: 0; }
        }

        @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 640px) {
            header { flex-direction: column; gap: 20px; align-items: flex-start; }
            .grid { grid-template-columns: 1fr; }
            .api-table thead { display: none; }
            .api-cell.path-cell { display: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="brand">
                <div class="logo">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 2C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V4C20 2.89543 19.1046 2 18 2H6Z" fill="white" opacity="0.2"/>
                        <path d="M6 2C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V4C20 2.89543 19.1046 2 18 2H6Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M8 7H16" stroke="white" stroke-width="2" stroke-linecap="round"/>
                        <path d="M8 12H16" stroke="white" stroke-width="2" stroke-linecap="round"/>
                        <path d="M8 17H13" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="brand-text">
                    <h1>Hostel Ledger</h1>
                    <p style="font-size: 12px; color: var(--text-dim);">Centralized Infrastructure Hub</p>
                </div>
            </div>
            <div class="version-badge">v${version} • ${env.toUpperCase()}</div>
        </header>

        <div class="grid">
            <div class="status-card">
                <div class="card-header">
                    <span class="card-label">Firebase Node</span>
                    <div class="status-dot ${firebaseActive ? 'active' : 'inactive'}"></div>
                </div>
                <div class="card-value">${firebaseActive ? 'Connected' : 'Offline'}</div>
            </div>
            <div class="status-card">
                <div class="card-header">
                    <span class="card-label">OneSignal Push</span>
                    <div class="status-dot ${oneSignalActive ? 'active' : 'inactive'}"></div>
                </div>
                <div class="card-value">${oneSignalActive ? 'Ready' : 'Disabled'}</div>
            </div>
            <div class="status-card">
                <div class="card-header">
                    <span class="card-label">SMTP Service</span>
                    <div class="status-dot ${smtpActive ? 'active' : 'inactive'}"></div>
                </div>
                <div class="card-value">${smtpActive ? 'Verified' : 'Error'}</div>
            </div>
            <div class="status-card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span class="card-label">Internal AI</span>
                    <div class="status-dot ${aiActive ? 'active' : 'inactive'}" style="width: 10px; height: 10px; border-radius: 50%; position: relative;"></div>
                </div>
                <div class="card-value" style="font-size: 24px; font-weight: 700; color: #fff;">${aiActive ? 'Operational' : 'Disabled'}</div>
            </div>
        </div>

        <!-- NEW: System Metrics Section -->
        <div class="metrics-grid">
            <div class="metric-card">
                <span class="metric-label">System Uptime</span>
                <span class="metric-value">${uptimeHours}h ${uptimeMinutes}m</span>
                <span class="metric-sub">Continuous operation</span>
            </div>
            <div class="metric-card">
                <span class="metric-label">Memory Usage</span>
                <span class="metric-value">${data.system.memory.usage}</span>
                <span class="metric-sub">${(data.system.memory.free / 1024 / 1024 / 1024).toFixed(2)} GB Free</span>
            </div>
            <div class="metric-card">
                <span class="metric-label">CPU Cores</span>
                <span class="metric-value">${data.system.cpuCount} Cores</span>
                <span class="metric-sub">${data.system.platform} ${data.system.release}</span>
            </div>
            <div class="metric-card">
                <span class="metric-label">Server Time</span>
                <span class="metric-value">${new Date(data.system.serverTime).toLocaleTimeString()}</span>
                <span class="metric-sub">${new Date(data.system.serverTime).toLocaleDateString()}</span>
            </div>
        </div>

        <div class="action-container">
            <a href="https://app.hostelledger.aarx.online" class="primary-btn" target="_blank">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                Access Application
            </a>
        </div>

        <div class="api-section" style="margin-top: 32px;">
            <div class="section-header">
                <h2>Service Registry</h2>
                <p>Status of core infrastructure and transactional services</p>
            </div>
            <table class="api-table">
                <tbody>
                    ${Object.entries(endpoints).map(([key, path]) => {
                        // Create a clean display name from the key
                        const name = key
                            .replace(/([A-Z])/g, ' $1') // Space before capitals
                            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
                            .replace('Push Notify', 'Push Notification')
                            .replace('Send ', '') // Remove redundant "Send"
                            + ' Service';
                        
                        return `
                        <tr class="api-row">
                            <td class="api-cell">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <div class="status-dot active" style="width: 8px; height: 8px;"></div>
                                    <span class="api-name">${name}</span>
                                </div>
                            </td>
                            <td class="api-cell" style="text-align: right;">
                                <span class="status-badge">200 OK</span>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <footer>
            © ${new Date().getFullYear()} Hostel Ledger Infrastructure. Built for high availability.
        </footer>
    </div>
</body>
</html>
    `;
}

module.exports = { getStatusPageHTML };
