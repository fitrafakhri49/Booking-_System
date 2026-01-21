"use client";

import { useEffect, useState } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function BookingPage() {
  const [date, setDate] = useState("");
  const [bookedTimes, setBookedTimes] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    start_time: "",
    end_time: "",
  });

  // Fetch booked times when date changes
  useEffect(() => {
    if (!date || !BASE_URL) return;

    fetch(`${BASE_URL}/bookings?date=${date}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBookedTimes(data);
        } else {
          setBookedTimes([]); // fallback aman
        }
      })
      .catch(() => setBookedTimes([]));
  }, [date]);

  const submit = async () => {
    const res = await fetch(`${BASE_URL}/booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        date,
      }),
    });

    const data = await res.json();
    alert(data.message || data.error);
  };

  return (
    <main style={{ padding: 20 }}>
      <h1>Booking</h1>

      <input
        type="text"
        placeholder="Name"
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />

      <input
        type="text"
        placeholder="Phone"
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />

      <input type="date" onChange={(e) => setDate(e.target.value)} />

      <input
        type="time"
        onChange={(e) => setForm({ ...form, start_time: e.target.value })}
      />

      <input
        type="time"
        onChange={(e) => setForm({ ...form, end_time: e.target.value })}
      />

      <button onClick={submit}>Submit Booking</button>

      <h2>Booked Times</h2>
      <ul>
        {bookedTimes.map((b, i) => (
          <li key={i}>
            {b.start_time} - {b.end_time}
          </li>
        ))}
      </ul>
    </main>
  );
}
