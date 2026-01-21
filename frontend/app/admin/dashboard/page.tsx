"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function Dashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    // guard: kalau belum login, langsung ke login
    if (!token) {
      router.push("/admin/login");
      return;
    }

    fetch(`${BASE_URL}/api/bookings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then(setBookings);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    router.push("/admin/login"); // arahkan ke halaman login
  };

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <ul>
        {bookings.map((b) => (
          <li key={b.ID}>
            {b.Name} | {new Date(b.StartTime).toLocaleString()} -{" "}
            {new Date(b.EndTime).toLocaleString()}
          </li>
        ))}
      </ul>
    </main>
  );
}
