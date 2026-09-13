import { Platform } from 'react-native';

/**
 * Origine delle API PHP in sviluppo (XAMPP su localhost:80).
 * Sull'emulatore Android la macchina host si raggiunge con 10.0.2.2.
 * Su simulatore iOS e su web va bene "localhost".
 */
const DEFAULT_DEV_ORIGIN =
  Platform.OS === 'android' ? 'http://10.0.2.2' : 'http://localhost';

/**
 * URL base delle API. Sovrascrivibile con la variabile EXPO_PUBLIC_API_URL
 * (file .env nella cartella Frontend) per puntare a un altro host,
 * per esempio quando il backend sarà messo in deploy.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? `${DEFAULT_DEV_ORIGIN}/ProgettoITS_Web/API`;
