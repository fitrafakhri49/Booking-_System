"use client";

import { useEffect, useState } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface TimeSlot {
  id: number;
  time: string;
  formattedTime: string;
  isBooked: boolean;
  bookingId?: string;
}

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  name: string;
  phone: string;
}

export default function BookingPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
  });

  const timeSlots: TimeSlot[] = Array.from({ length: 9 }, (_, i) => {
    const hour = i + 9;
    const time = `${hour.toString().padStart(2, "0")}:00`;

    const isBooked = bookings.some((booking) => {
      const start = booking.start_time.slice(0, 5);
      const end = booking.end_time.slice(0, 5);
      return time >= start && time < end;
    });

    return {
      id: i,
      time,
      formattedTime: hour <= 12 ? `${hour}:00 AM` : `${hour - 12}:00 PM`,
      isBooked,
    };
  });

  // Fetch bookings for selected date
  useEffect(() => {
    if (!BASE_URL) return;

    const dateStr = selectedDate.toISOString().split("T")[0];

    fetch(`${BASE_URL}/bookings?date=${dateStr}`)
      .then((res) => res.json())
      .then((data: Booking[]) => {
        if (Array.isArray(data)) {
          setBookings(data);
        } else {
          setBookings([]);
        }
      })
      .catch(() => setBookings([]));
  }, [selectedDate]);

  // Navigation functions
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
    setSelectedSlots([]);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
    setSelectedSlots([]);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
    setSelectedSlots([]);
  };

  // Handle time slot selection
  const handleSlotClick = (slotId: number) => {
    if (timeSlots[slotId].isBooked) return;

    setSelectedSlots((prev) => {
      if (prev.includes(slotId)) {
        return prev.filter((id) => id !== slotId);
      } else {
        return [...prev, slotId].sort((a, b) => a - b);
      }
    });
  };

  // Format selected slots into start and end times
  const getSelectedTimeRange = () => {
    if (selectedSlots.length === 0) return null;

    const sortedSlots = [...selectedSlots].sort((a, b) => a - b);
    const startSlot = timeSlots[sortedSlots[0]];
    const endSlot = timeSlots[sortedSlots[sortedSlots.length - 1]];

    // For end time, add one hour
    const endHour = parseInt(endSlot.time.split(":")[0]) + 1;
    const endTime = `${endHour.toString().padStart(2, "0")}:00`;

    return {
      start_time: startSlot.time,
      end_time: endTime,
    };
  };

  const submitBooking = async () => {
    if (selectedSlots.length === 0) {
      alert("Please select at least one time slot");
      return;
    }

    if (!form.name.trim() || !form.phone.trim()) {
      alert("Please fill in your name and phone number");
      return;
    }

    const timeRange = getSelectedTimeRange();
    if (!timeRange) return;

    const bookingData = {
      ...form,
      ...timeRange,
      date: selectedDate.toISOString().split("T")[0],
    };

    try {
      const res = await fetch(`${BASE_URL}/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Booking successful!");
        // Refresh bookings
        const dateStr = selectedDate.toISOString().split("T")[0];
        const refreshRes = await fetch(`${BASE_URL}/bookings?date=${dateStr}`);
        const refreshedBookings = await refreshRes.json();
        setBookings(refreshedBookings);
        setSelectedSlots([]);
        setForm({ name: "", phone: "" });
      } else {
        alert(data.error || "Booking failed");
      }
    } catch (error) {
      alert("Error submitting booking");
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <main
      style={{
        padding: "40px 20px",
        maxWidth: "800px",
        margin: "0 auto",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "2.5rem",
          marginBottom: "30px",
          color: "#333",
          textAlign: "center",
        }}
      >
        Service Booking
      </h1>

      {/* Calendar Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          padding: "20px",
          backgroundColor: "#f8f9fa",
          borderRadius: "10px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <button
          onClick={goToPreviousDay}
          style={{
            padding: "10px 20px",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          ← Previous
        </button>

        <div style={{ textAlign: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.5rem", color: "#333" }}>
            {formatDate(selectedDate)}
          </h2>
          <button
            onClick={goToToday}
            style={{
              marginTop: "10px",
              padding: "8px 16px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Today
          </button>
        </div>

        <button
          onClick={goToNextDay}
          style={{
            padding: "10px 20px",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Next →
        </button>
      </div>

      {/* Time Slots Grid */}
      <div
        style={{
          marginBottom: "40px",
          backgroundColor: "white",
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}
      >
        <h3
          style={{
            padding: "20px",
            margin: 0,
            backgroundColor: "#f8f9fa",
            borderBottom: "1px solid #e9ecef",
          }}
        >
          Available Time Slots (9 AM - 5 PM)
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
            padding: "20px",
          }}
        >
          {timeSlots.map((slot) => {
            const isSelected = selectedSlots.includes(slot.id);
            const isConsecutive =
              selectedSlots.length > 0 &&
              Math.abs(slot.id - selectedSlots[selectedSlots.length - 1]) === 1;

            return (
              <button
                key={slot.id}
                onClick={() => handleSlotClick(slot.id)}
                disabled={slot.isBooked}
                style={{
                  padding: "20px 10px",
                  backgroundColor: slot.isBooked
                    ? "#dc3545"
                    : isSelected
                    ? "#0070f3"
                    : "#f8f9fa",
                  color: slot.isBooked || isSelected ? "white" : "#333",
                  border: isSelected
                    ? "2px solid #0056b3"
                    : slot.isBooked
                    ? "2px solid #c82333"
                    : "2px solid transparent",
                  borderRadius: "8px",
                  cursor: slot.isBooked ? "not-allowed" : "pointer",
                  fontSize: "1.1rem",
                  fontWeight: "500",
                  transition: "all 0.2s ease",
                  opacity: slot.isBooked ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!slot.isBooked) {
                    e.currentTarget.style.backgroundColor = isSelected
                      ? "#0056b3"
                      : "#e9ecef";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!slot.isBooked) {
                    e.currentTarget.style.backgroundColor = isSelected
                      ? "#0070f3"
                      : "#f8f9fa";
                  }
                }}
              >
                {slot.formattedTime}
                {slot.isBooked && (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      marginTop: "5px",
                      opacity: 0.9,
                    }}
                  >
                    Booked
                  </div>
                )}
                {isSelected && (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      marginTop: "5px",
                      opacity: 0.9,
                    }}
                  >
                    Selected
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Booking Form */}
      <div
        style={{
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "10px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          marginBottom: "30px",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>
          Your Information
        </h3>

        <div style={{ display: "grid", gap: "20px", marginBottom: "30px" }}>
          <input
            type="text"
            placeholder="Your Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={{
              padding: "15px",
              fontSize: "1rem",
              border: "2px solid #e9ecef",
              borderRadius: "8px",
              width: "100%",
              boxSizing: "border-box",
            }}
          />

          <input
            type="tel"
            placeholder="Phone Number *"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            style={{
              padding: "15px",
              fontSize: "1rem",
              border: "2px solid #e9ecef",
              borderRadius: "8px",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div
          style={{
            padding: "15px",
            backgroundColor: "#e7f1ff",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", color: "#0056b3" }}>
            Selected Time Range
          </h4>
          {getSelectedTimeRange() ? (
            <p style={{ margin: 0, fontSize: "1.1rem" }}>
              {getSelectedTimeRange()?.start_time} -{" "}
              {getSelectedTimeRange()?.end_time}
              <br />
              <small style={{ color: "#666" }}>
                ({selectedSlots.length} hour
                {selectedSlots.length > 1 ? "s" : ""})
              </small>
            </p>
          ) : (
            <p style={{ margin: 0, color: "#666" }}>No time slots selected</p>
          )}
        </div>

        <button
          onClick={submitBooking}
          disabled={
            selectedSlots.length === 0 ||
            !form.name.trim() ||
            !form.phone.trim()
          }
          style={{
            padding: "15px 30px",
            backgroundColor: selectedSlots.length > 0 ? "#28a745" : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: selectedSlots.length > 0 ? "pointer" : "not-allowed",
            fontSize: "1.1rem",
            fontWeight: "600",
            width: "100%",
            transition: "background-color 0.2s ease",
          }}
        >
          Confirm Booking
        </button>
      </div>

      {/* Booked Times List */}
      <div
        style={{
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "10px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>
          Bookings for {selectedDate.toLocaleDateString()}
        </h3>

        {bookings.length === 0 ? (
          <p style={{ color: "#666", textAlign: "center", padding: "20px" }}>
            No bookings for this date
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              display: "grid",
              gap: "10px",
            }}
          >
            {bookings.map((booking, index) => (
              <li
                key={booking.id || index}
                style={{
                  padding: "15px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "8px",
                  borderLeft: "4px solid #0070f3",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "1.1rem" }}>
                      {booking.start_time} - {booking.end_time}
                    </strong>
                    <div style={{ color: "#666", marginTop: "5px" }}>
                      {booking.name} • {booking.phone}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
