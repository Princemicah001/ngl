export interface DeviceHintData {
  device: string;
  os: string;
  browser: string;
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  isp?: string;
  screen?: string;
  timestamp: number;
}

/**
 * Detect real client device, browser, OS, and screen specs
 */
export function detectClientDevice(): {
  device: string;
  os: string;
  browser: string;
  screen: string;
} {
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  
  let os = 'Unknown OS';
  let device = 'Mobile App / Browser';
  let browser = 'Web Browser';

  // Detect OS & Device
  if (/iPhone/i.test(ua)) {
    const match = ua.match(/OS (\d+[_\d]*)/);
    const osVersion = match ? match[1].replace(/_/g, '.') : '17.4';
    os = `iOS ${osVersion}`;
    device = `iPhone (${os})`;
  } else if (/iPad/i.test(ua)) {
    os = 'iPadOS';
    device = 'iPad (Tablet)';
  } else if (/Android/i.test(ua)) {
    const match = ua.match(/Android (\d+(\.\d+)?)/);
    const osVersion = match ? match[1] : '14';
    os = `Android ${osVersion}`;
    if (/Samsung/i.test(ua)) device = `Samsung Galaxy (${os})`;
    else if (/Pixel/i.test(ua)) device = `Google Pixel (${os})`;
    else device = `Android Device (${os})`;
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
    device = 'MacBook / Mac (macOS)';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows 11';
    device = 'Windows PC';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    device = 'Linux Desktop';
  }

  // Detect Browser
  if (/Edg\//i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/Firefox\//i.test(ua)) {
    browser = 'Mozilla Firefox';
  }

  const screen = `${window.screen.width}×${window.screen.height} (@${window.devicePixelRatio || 1}x)`;

  return {
    device: `${device} - ${browser}`,
    os,
    browser,
    screen
  };
}

/**
 * Capture real IP and geolocation clues safely with fast fallback
 */
export async function captureRealDeviceHints(): Promise<DeviceHintData> {
  const localDetails = detectClientDevice();
  const timestamp = Date.now();

  try {
    // Fast fetch from public IP and geo lookup (timeout after 1.8s to avoid blocking message send)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch('https://ipwho.is/', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false) {
        const hintResult: DeviceHintData = {
          device: localDetails.device,
          os: localDetails.os,
          browser: localDetails.browser,
          ip: data.ip || '192.168.1.1',
          city: data.city || 'Near your area',
          region: data.region || '',
          country: data.country || 'United States',
          isp: data.connection?.isp || data.connection?.org || 'Mobile Carrier',
          screen: localDetails.screen,
          timestamp
        };
        return hintResult;
      }
    }
  } catch (e) {
    // Fallback attempt with ipify
    try {
      const ipifyRes = await fetch('https://api.ipify.org?format=json');
      if (ipifyRes.ok) {
        const ipData = await ipifyRes.json();
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const cityGuess = timeZone.split('/')[1]?.replace(/_/g, ' ') || 'Nearby City';
        return {
          device: localDetails.device,
          os: localDetails.os,
          browser: localDetails.browser,
          ip: ipData.ip || '192.168.1.1',
          city: cityGuess,
          country: timeZone.split('/')[0] || 'Local Region',
          isp: 'Broadband / Cellular',
          screen: localDetails.screen,
          timestamp
        };
      }
    } catch (err2) {
      // Continue to local fallback
    }
  }

  // Fallback to time zone and device
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const cityGuess = timeZone.split('/')[1]?.replace(/_/g, ' ') || 'Nearby City';

  return {
    device: localDetails.device,
    os: localDetails.os,
    browser: localDetails.browser,
    ip: '127.0.0.1 (Local)',
    city: cityGuess,
    country: timeZone.split('/')[0] || 'Local Region',
    isp: 'Broadband / Cellular',
    screen: localDetails.screen,
    timestamp
  };
}
