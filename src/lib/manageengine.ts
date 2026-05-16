export interface MDMDevice {
  device_id: number;
  device_name: string;
  imei: string;
}

export const getManageEngineUrl = () => process.env.MANAGEENGINE_URL || 'https://mdm.manageengine.com/api/v1/mdm';

// Cache for the OAuth access token to avoid fetching it on every single request
let cachedAccessToken: string | null = null;
let tokenExpirationTime: number = 0;

/**
 * Gets a valid access token using the Refresh Token.
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if it's still valid (leaving 1 min buffer)
  if (cachedAccessToken && Date.now() < tokenExpirationTime - 60000) {
    return cachedAccessToken;
  }

  const clientId = process.env.MANAGEENGINE_CLIENT_ID;
  const clientSecret = process.env.MANAGEENGINE_CLIENT_SECRET;
  const refreshToken = process.env.MANAGEENGINE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("ManageEngine OAuth credentials are not properly configured in environment variables.");
  }

  // Zoho Accounts URL for obtaining the access token
  const tokenUrl = `https://accounts.zoho.com/oauth/v2/token?refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token`;

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST'
    });

    if (!res.ok) {
      throw new Error(`Failed to refresh token: ${await res.text()}`);
    }

    const data = await res.json();
    
    if (data.error) {
      throw new Error(`OAuth Error: ${data.error}`);
    }

    cachedAccessToken = data.access_token;
    // Zoho tokens typically expire in 3600 seconds (1 hour)
    tokenExpirationTime = Date.now() + (data.expires_in * 1000);

    return cachedAccessToken as string;
  } catch (error) {
    console.error("Error fetching ManageEngine access token:", error);
    throw error;
  }
}

async function getAuthHeaders() {
  const token = await getAccessToken();
  return {
    'Authorization': `Zoho-oauthtoken ${token}`,
    'Accept': 'application/vnd.manageengine.mdm.v1+json',
    'Content-Type': 'application/json'
  };
}

export async function getDeviceByImei(imei: string): Promise<MDMDevice | null> {
  // La API de ManageEngine usa ?imei= para filtrar por IMEI directamente
  const url = `${getManageEngineUrl()}/devices?imei=${imei}`;
  
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(url, { headers });

    if (!res.ok) {
      console.error('MDM API Error getting device:', await res.text());
      return null;
    }

    const data = await res.json();
    if (data.devices && data.devices.length > 0) {
      return data.devices[0];
    }
    return null;
  } catch (err) {
    console.error('Failed to get device by IMEI:', err);
    return null;
  }
}

export async function lockDevice(deviceId: number, message: string = 'Equipo bloqueado por mora en el pago. Por favor contacte a Tecnicell Créditos al 311 625 1841.', phone: string = '3116251841'): Promise<boolean> {
  const url = `${getManageEngineUrl()}/devices/${deviceId}/commands`;
  
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        command_name: "EnableLostMode",
        command_parameters: {
          contact_number: phone,
          lock_message: message
        }
      })
    });

    if (!res.ok) {
      console.error('MDM API Error locking device:', await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to lock device:', err);
    return false;
  }
}

export async function unlockDevice(deviceId: number): Promise<boolean> {
  const url = `${getManageEngineUrl()}/devices/${deviceId}/commands`;
  
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        command_name: "DisableLostMode"
      })
    });

    if (!res.ok) {
      console.error('MDM API Error unlocking device:', await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to unlock device:', err);
    return false;
  }
}
