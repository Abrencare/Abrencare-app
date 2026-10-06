import { Alert, Platform } from 'react-native';

/**
 * Local notifications for visit updates.
 *
 * expo-notifications is required lazily: it was added after the current
 * development build was compiled, so until the client is rebuilt we fall back
 * to an in-app alert instead of crashing.
 */

type NotificationModule = typeof import('expo-notifications');

let cached: NotificationModule | null | undefined;
let handlerReady = false;

function loadModule(): NotificationModule | null {
  if (cached !== undefined) {
    return cached;
  }

  try {
    cached = require('expo-notifications') as NotificationModule;
  } catch {
    cached = null;
  }

  return cached;
}

export type VisitNotification = {
  title: string;
  body: string;
  /** In-app route opened when the notification is tapped. */
  url: string;
};

export async function requestNotificationPermission() {
  const notifications = loadModule();

  if (!notifications || Platform.OS === 'web') {
    return false;
  }

  try {
    if (!handlerReady) {
      notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      handlerReady = true;
    }

    const current = await notifications.getPermissionsAsync();
    if (current.granted) {
      return true;
    }

    const next = await notifications.requestPermissionsAsync();
    return next.granted;
  } catch {
    return false;
  }
}

/** Delivers immediately; returns how it was delivered. */
export async function sendVisitNotification(
  notification: VisitNotification,
): Promise<'push' | 'inApp'> {
  const granted = await requestNotificationPermission();
  const notifications = loadModule();

  if (granted && notifications) {
    try {
      await notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: { url: notification.url },
          sound: true,
        },
        trigger: null,
      });
      return 'push';
    } catch {
      // Fall through to the in-app alert.
    }
  }

  Alert.alert(notification.title, notification.body);
  return 'inApp';
}

export function addNotificationTapListener(open: (url: string) => void) {
  const notifications = loadModule();

  if (!notifications || Platform.OS === 'web') {
    return () => {};
  }

  try {
    const subscription = notifications.addNotificationResponseReceivedListener(
      (response) => {
        const url = response.notification.request.content.data?.url;

        if (typeof url === 'string') {
          open(url);
        }
      },
    );

    return () => subscription.remove();
  } catch {
    return () => {};
  }
}
