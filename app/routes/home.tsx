import React from 'react';
import { Link } from 'react-router';
import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <div>
      <h1>Home Page</h1>
      <nav>
        <ul>
          <li><Link to="/baby">Baby</Link></li>
          <li><Link to="/bus">Bus</Link></li>
          <li><Link to="/clock">Clock</Link></li>
        </ul>
      </nav>
      <Welcome />
    </div>
  );
}
