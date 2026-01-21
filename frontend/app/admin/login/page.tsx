"use client";

import { useState } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
      window.location.href = "/admin/dashboard";
    } else {
      alert("Login failed");
    }
  };

  return (
    <main>
      <h1>Admin Login</h1>
      <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={login}>Login</button>
    </main>
  );
}
