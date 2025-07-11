import type { Config } from "@react-router/dev/config";

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  // アプリケーション全体をSPAモードとして設定
  ssr: false,
  // ビルド時に静的生成したいページのパスを指定
  prerender: [
    "/", // トップページ
  ],
} satisfies Config;
