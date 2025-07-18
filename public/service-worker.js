// サービスワーカーのバージョン（キャッシュの更新に使用）
const CACHE_VERSION = 'v1';

// 異なるタイプのリソース用に複数のキャッシュを使用
const CACHE_NAMES = {
    static: `mornd-static-${CACHE_VERSION}`,
    dynamic: `mornd-dynamic-${CACHE_VERSION}`,
    images: `mornd-images-${CACHE_VERSION}`
};

// インストール時にキャッシュするファイル（静的アセット）
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/icons/icon-192x192.svg',
    '/icons/icon-512x512.svg',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/maskable-icon.svg'
];

// インストール時にキャッシュするアプリケーションシェル
const APP_SHELL_ASSETS = [
    // CSSファイル
    '/build/client/css/app.css',
    // JSファイル
    '/build/client/js/app.js',
    // フォントファイル
    'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap'
];

// キャッシュするイメージファイルの拡張子
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'];

// リクエストがイメージかどうかを判断する関数
function isImageRequest(request) {
    const url = new URL(request.url);
    return IMAGE_EXTENSIONS.some(ext => url.pathname.endsWith(`.${ext}`));
}

// インストールイベント
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Install');

    // キャッシュの準備
    event.waitUntil(
        Promise.all([
            // 静的アセットのキャッシュ
            caches.open(CACHE_NAMES.static)
                .then((cache) => {
                    console.log('[Service Worker] Caching static assets');
                    return cache.addAll(STATIC_ASSETS);
                }),

            // アプリケーションシェルのキャッシュ
            caches.open(CACHE_NAMES.static)
                .then((cache) => {
                    console.log('[Service Worker] Caching app shell');
                    return cache.addAll(APP_SHELL_ASSETS);
                })
        ])
            .then(() => {
                // 新しいサービスワーカーをすぐにアクティブにする
                return self.skipWaiting();
            })
    );
});

// アクティベーションイベント
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activate');

    // 古いキャッシュを削除
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                // 現在のバージョンのキャッシュ以外を削除
                if (!Object.values(CACHE_NAMES).includes(key)) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
            .then(() => {
                // 新しいサービスワーカーがすぐにクライアントを制御できるようにする
                return self.clients.claim();
            })
    );
});

// フェッチイベント（ネットワークリクエストの制御）
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // HTMLリクエストはネットワークファーストで処理
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return caches.match(request);
                })
        );
        return;
    }

    // イメージリクエストはキャッシュファーストで処理
    if (isImageRequest(request)) {
        event.respondWith(
            caches.match(request)
                .then((response) => {
                    // キャッシュにあればそれを返す
                    if (response) {
                        return response;
                    }

                    // キャッシュになければネットワークから取得
                    return fetch(request)
                        .then((response) => {
                            // 有効なレスポンスのみキャッシュ
                            if (!response || response.status !== 200) {
                                return response;
                            }

                            // レスポンスをクローンしてキャッシュに保存
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAMES.images)
                                .then((cache) => {
                                    cache.put(request, responseToCache);
                                });

                            return response;
                        });
                })
        );
        return;
    }

    // その他のリクエストはネットワークファーストで処理し、動的にキャッシュ
    event.respondWith(
        fetch(request)
            .then((response) => {
                // 有効なレスポンスのみキャッシュ
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // レスポンスをクローンしてキャッシュに保存
                const responseToCache = response.clone();
                caches.open(CACHE_NAMES.dynamic)
                    .then((cache) => {
                        cache.put(request, responseToCache);
                    });

                return response;
            })
            .catch(() => {
                // ネットワークが利用できない場合はキャッシュから取得
                return caches.match(request);
            })
    );
});

// バックグラウンド検出と最適化はメインスレッドで行う必要があります
// サービスワーカーはバックグラウンドで実行されるため、
// visibilitychangeイベントやBattery APIにはアクセスできません

// クライアントからのメッセージ処理
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'APP_STATE_CHANGE') {
        if (event.data.state === 'background') {
            // アプリがバックグラウンドにある場合の処理
            console.log('[Service Worker] App is in background');

            // 不要なリソースの読み込みを抑制
            // バックグラウンド処理の頻度を下げる
        } else if (event.data.state === 'foreground') {
            // アプリがフォアグラウンドにある場合の処理
            console.log('[Service Worker] App is in foreground');

            // 通常の処理を再開
        }
    }

    if (event.data && event.data.type === 'BATTERY_STATE_CHANGE') {
        if (event.data.level < 0.2) {
            // バッテリー残量が少ない場合の処理
            console.log('[Service Worker] Battery level is low');

            // バックグラウンド処理の頻度を下げる
        }
    }
});

// React Routerのルーティングとキャッシュ戦略の連携

// 頻繁にアクセスされるルート（優先的にキャッシュ）
const PRIORITY_ROUTES = [
    '/',
    '/dashboard',
    '/profile'
];

// 動的ルートのパターン
const DYNAMIC_ROUTE_PATTERNS = [
    /^\/user\/\d+$/,  // /user/123 のようなパターン
    /^\/product\/\w+$/ // /product/abc のようなパターン
];

// 注: 上記のfetchイベントリスナーと統合するため、このコードは削除します
// React Routerのルーティングとキャッシュ戦略は上記のfetchイベントリスナーで実装します