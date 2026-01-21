"use client";

import { useEffect, useState } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function Dashboard() {
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    fetch(`${BASE_URL}/api/bookings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then(setBookings);
  }, []);

  return (
    <main>
      <h1>Admin Dashboard</h1>

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
