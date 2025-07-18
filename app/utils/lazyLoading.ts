/**
 * 画像の遅延読み込み（Lazy Loading）を実装するユーティリティ関数
 */

/**
 * 画像の遅延読み込みを設定する
 * Intersection Observerを使用して、画面に表示されたときに画像を読み込む
 */
export function setupLazyLoading(): void {
  // ブラウザがIntersection Observerをサポートしているかチェック
  if ('IntersectionObserver' in window) {
    // 遅延読み込み用のIntersection Observerを作成
    const lazyImageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        // 画面に表示された場合
        if (entry.isIntersecting) {
          const lazyImage = entry.target as HTMLImageElement;

          // data-src属性からsrc属性に値を移動
          if (lazyImage.dataset.src) {
            lazyImage.src = lazyImage.dataset.src;
            delete lazyImage.dataset.src;
          }

          // data-srcset属性からsrcset属性に値を移動
          if (lazyImage.dataset.srcset) {
            lazyImage.srcset = lazyImage.dataset.srcset;
            delete lazyImage.dataset.srcset;
          }

          // クラスを更新
          lazyImage.classList.remove('lazy');
          lazyImage.classList.add('loaded');

          // 監視を解除
          lazyImageObserver.unobserve(lazyImage);
        }
      });
    });

    // 遅延読み込み対象の画像を監視
    const lazyImages = document.querySelectorAll('img.lazy');
    lazyImages.forEach((lazyImage) => {
      lazyImageObserver.observe(lazyImage);
    });
  } else {
    // Intersection Observerがサポートされていない場合のフォールバック
    // すべての画像を即時読み込み
    const lazyImages = document.querySelectorAll('img.lazy');
    lazyImages.forEach((lazyImage: HTMLImageElement) => {
      if (lazyImage.dataset.src) {
        lazyImage.src = lazyImage.dataset.src;
        delete lazyImage.dataset.src;
      }
      if (lazyImage.dataset.srcset) {
        lazyImage.srcset = lazyImage.dataset.srcset;
        delete lazyImage.dataset.srcset;
      }
      lazyImage.classList.remove('lazy');
      lazyImage.classList.add('loaded');
    });
  }
}

/**
 * 画像の遅延読み込みを設定するReactフック
 */
export function useLazyLoading(): void {
  // クライアントサイドでのみ実行
  if (typeof window !== 'undefined') {
    // DOMが読み込まれた後に実行
    if (document.readyState === 'complete') {
      setupLazyLoading();
    } else {
      window.addEventListener('load', setupLazyLoading);
      // クリーンアップ関数
      return () => {
        window.removeEventListener('load', setupLazyLoading);
      };
    }
  }
}