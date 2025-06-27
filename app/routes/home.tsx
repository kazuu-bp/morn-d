import type { Route } from "./+types/home";
import Welcome from "./welcome";


// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function meta({ data }: Route.MetaArgs) {
  return [
    { title: "Family Dashboard" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {

  return (
    <div>
      < Welcome />
    </div>
  )
};
