/**
 * Detects device and location from IP and User Agent
 */
const net = require('net');

// Simple User Agent Parser
const getDeviceFromUA = (userAgent) => {
    if (!userAgent) return { os: 'Unknown', browser: 'Unknown', device: 'Unknown' };

    let os = 'Unknown OS';
    // Check Mobile/Tablets first
    if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    // Then Desktop
    else if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';

    let browser = 'Unknown Browser';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edg')) browser = 'Edge';

    let device = 'Desktop';
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) device = 'Mobile';
    else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) device = 'Tablet';

    return { os, browser, device };
};

// Get Location from IP (using ip-api.com)
const getLocationFromIP = async (ip) => {
    // Validate IP format using net module (prevent path traversal/injection)
    if (!ip || !net.isIP(ip)) {
        console.warn(`⚠️ Invalid IP detected: ${ip}`);
        return {
            city: 'Unknown',
            region: 'Unknown',
            country: 'Unknown',
            isp: 'Unknown',
            timezone: 'UTC'
        };
    }

    // Localhost check
    if (ip === '::1' || ip === '127.0.0.1') {
        return {
            city: 'Localhost',
            region: 'Local',
            country: 'Local',
            isp: 'Internal Loopback',
            timezone: 'UTC'
        };
    }

    try {
        // Use ip-api.com (Free for non-commercial)
        const response = await fetch(`http://ip-api.com/json/${ip}`);
        if (!response.ok) throw new Error('IP API failed');

        const data = await response.json();
        if (data.status === 'fail') {
            return {
                city: 'Unknown',
                region: 'Unknown',
                country: 'Unknown',
                isp: 'Unknown',
                timezone: 'UTC'
            };
        }

        return {
            city: data.city || 'Unknown',
            region: data.regionName || 'Unknown',
            country: data.country || 'Unknown',
            isp: data.isp || 'Unknown',
            timezone: data.timezone || 'UTC'
        };
    } catch (error) {
        console.warn('⚠️ IP Geolocation failed:', error.message);
        return {
            city: 'Unknown',
            region: 'Unknown',
            country: 'Unknown',
            isp: 'Unknown',
            timezone: 'UTC'
        };
    }
};

module.exports = { getDeviceFromUA, getLocationFromIP };
