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

export async function getDeviceByImei(imei: string): Promise<any | null> {
  // Eliminar espacios y saltos de linea
  imei = imei.trim();
  // Primero intentamos la búsqueda global de ManageEngine con "search"
  const url = `${getManageEngineUrl()}/devices?search=${imei}`;
  
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(url, { headers, cache: 'no-store' });

    if (res.status === 401 || res.status === 403) {
      throw new Error(`Error de Autenticación con ManageEngine (Status ${res.status}). Token inválido.`);
    }

    if (res.ok) {
      const text = await res.text();
      if (text) {
        const data = JSON.parse(text);
        if (data.devices && data.devices.length > 0) {
          // Filtrar por IMEI para asegurar que es el correcto (ya que search busca por nombre/serial/etc)
          const device = data.devices.find((d: any) => 
            d.imei === imei || 
            (Array.isArray(d.imei) && d.imei.includes(imei))
          );
          if (device) return device;
        }
      }
    }

    // FALLBACK: Si no lo encuentra por parámetro de búsqueda, traemos los dispositivos y buscamos manualmente
    const fallbackUrl = `${getManageEngineUrl()}/devices`;
    const fallbackRes = await fetch(fallbackUrl, { headers, cache: 'no-store' });
    
    if (fallbackRes.status === 401 || fallbackRes.status === 403) {
      throw new Error(`Error de Autenticación con ManageEngine (Status ${fallbackRes.status}). Token inválido.`);
    }

    if (fallbackRes.ok) {
      const text = await fallbackRes.text();
      if (text) {
        const data = JSON.parse(text);
        if (data.devices && data.devices.length > 0) {
          const device = data.devices.find((d: any) => 
            d.imei === imei || 
            (Array.isArray(d.imei) && d.imei.includes(imei))
          );
          if (device) return device;
          
          // DEBUG: If not found, throw error with exactly what we got
          const foundImeis = data.devices.map((d: any) => JSON.stringify(d.imei)).join(' | ');
          throw new Error(`Fallback trajo ${data.devices.length} equipos, pero ninguno coincide con ${imei}. IMEIs recibidos: ${foundImeis.substring(0, 150)}...`);
        }
      }
    }

    throw new Error("No se obtuvieron dispositivos de la API (Respuesta vacía)");
  } catch (err) {
    console.error('Failed to get device by IMEI:', err);
    throw err; // PROPAGAR el error para que la UI lo pueda mostrar
  }
}

export async function lockDevice(deviceId: number, message: string = 'Equipo bloqueado por mora en el pago. Por favor contacte a Tecnicell Créditos al 311 625 1841.', phone: string = '3116251841'): Promise<boolean> {
  // Para bloquear con Modo Kiosco, reanudamos el kiosco para atrapar al usuario en la app de bloqueo
  const url = `${getManageEngineUrl()}/devices/${deviceId}/actions/resume_kiosk`;
  
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({}) // Kiosk commands usually don't need body, just the endpoint
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
  // Para desbloquear con Modo Kiosco, pausamos el kiosco para que puedan usar el equipo
  const url = `${getManageEngineUrl()}/devices/${deviceId}/actions/pause_kiosk`;
  
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
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
