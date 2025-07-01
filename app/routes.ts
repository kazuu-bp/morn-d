import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  route("/", "routes/home.tsx", [ // Homeを親ルートとして定義し、子ルートを直接配列で渡す
    index("routes/welcome.tsx"), // Homeのデフォルトの子ルート（例: / にアクセスしたときに表示）
    route("baby", "routes/babyPage.tsx"), // /baby にアクセス
    route("bus", "routes/busPage.tsx"),   // /bus にアクセス
    route("clock", "routes/clockPage.tsx"), // /clock にアクセス
  ]),
] satisfies RouteConfig;
