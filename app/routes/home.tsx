import React from 'react';
import logoDark from "../welcome/logo-dark.svg";
import logoLight from "../welcome/logo-light.svg";
import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <div>
      <Welcome />
    </div>
  );
}
