/**
 * サービスワーカーの登録を行うユーティリティ関数
 */

/**
 * サービスワーカーを登録する
 * @returns サービスワーカーの登録が成功したかどうかを示すPromise
 */
export function registerServiceWorker(): Promise<boolean> {
  // サービスワーカーがサポートされているかチェック
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope:', registration.scope);
        return true;
      })
      .catch((error) => {
        console.error('ServiceWorker registration failed:', error);
        return false;
      });
  }

  // サービスワーカーがサポートされていない場合
  console.warn('ServiceWorker is not supported in this browser');
  return Promise.resolve(false);
}

/**
 * サービスワーカーの登録を解除する
 * @returns サービスワーカーの登録解除が成功したかどうかを示すPromise
 */
export function unregisterServiceWorker(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker.ready
      .then((registration) => {
        return registration.unregister();
      })
      .then(() => {
        console.log('ServiceWorker unregistered');
        return true;
      })
      .catch((error) => {
        console.error('ServiceWorker unregistration failed:', error);
        return false;
      });
  }

  return Promise.resolve(false);
}

/**
 * サービスワーカーの状態を取得する
 * @returns サービスワーカーの状態を示すPromise
 */
export function getServiceWorkerStatus(): Promise<{
  supported: boolean;
  registered: boolean;
  controller: ServiceWorker | null;
}> {
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        return {
          supported: true,
          registered: registrations.length > 0,
          controller: navigator.serviceWorker.controller
        };
      })
      .catch((error) => {
        console.error('Failed to get ServiceWorker registrations:', error);
        return {
          supported: true,
          registered: false,
          controller: null
        };
      });
  }

  return Promise.resolve({
    supported: false,
    registered: false,
    controller: null
  });
}