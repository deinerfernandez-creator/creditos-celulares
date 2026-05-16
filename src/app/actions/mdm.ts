"use server";

import { getDeviceByImei, lockDevice, unlockDevice } from '@/lib/manageengine';

export async function setDeviceLockStatus(imei: string, lock: boolean) {
  if (!imei) {
    return { success: false, error: 'IMEI no proporcionado.' };
  }

  try {
    const device = await getDeviceByImei(imei);
    
    if (!device) {
      return { success: false, error: 'Dispositivo no encontrado en ManageEngine MDM usando el IMEI proporcionado.' };
    }

    let result = false;
    if (lock) {
      result = await lockDevice(device.device_id);
    } else {
      result = await unlockDevice(device.device_id);
    }

    if (result) {
      return { success: true };
    } else {
      return { success: false, error: 'Fallo al ejecutar el comando en ManageEngine MDM.' };
    }
  } catch (err) {
    console.error('MDM Action Error:', err);
    return { success: false, error: 'Error interno de comunicación con MDM.' };
  }
}
