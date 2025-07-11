import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from 'path'; // pathモジュールをインポート

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  build: {
    outDir: 'build',
  },
  resolve: {
    alias: {
      // tsconfig.json の paths 設定と合わせる
      // `morn-d` というエイリアスで `types/src` ディレクトリを指す
      'morn-d': path.resolve(__dirname, './app/types'),
      // 他のエイリアスもここに追加
      '~': path.resolve(__dirname, './app'), // `~/` も使っているなら追加
    },
  },
});
