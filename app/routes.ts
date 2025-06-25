import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/baby", "routes/baby.tsx"),
  route("/bus", "routes/bus.tsx"),
  route("/clock", "routes/clock.tsx"),
] satisfies RouteConfig;
