export interface MDMDevice {
  device_id: number;
  device_name: string;
  imei: string;
}

export const getManageEngineUrl = () => process.env.MANAGEENGINE_URL || 'https://mdm.manageengine.com/api/v1/mdm';
export const getManageEngineKey = () => process.env.MANAGEENGINE_API_KEY || '';

const getAuthHeaders = () => {
  const key = getManageEngineKey();
  // ManageEngine Cloud typically uses Zoho-oauthtoken
  const authHeader = key.startsWith('Zoho-oauthtoken') ? key : `Zoho-oauthtoken ${key}`;
  return {
    'Authorization': authHeader,
    'Accept': 'application/vnd.manageengine.mdm.v1+json',
    'Content-Type': 'application/json'
  };
};

export async function getDeviceByImei(imei: string): Promise<MDMDevice | null> {
  const url = `${getManageEngineUrl()}/devices?search_name=${imei}`;
  // Nota: Algunas versiones de la API usan ?search_name=IMEI o ?imei=IMEI
  
  try {
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });

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
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
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
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
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
