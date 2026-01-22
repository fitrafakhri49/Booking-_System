"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface Booking {
  ID: string;
  Name: string;
  Phone: string;
  StartTime: string;
  EndTime: string;
  Date: string;
  Status: string;
}

export default function Dashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const router = useRouter();

  // Check authentication and fetch bookings
  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      router.push("/admin/login");
      return;
    }

    fetchBookings(token);
  }, [router]);

  const fetchBookings = async (token: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem("access_token");
        router.push("/admin/login");
        return;
      }

      const data = await response.json();
      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    router.push("/admin/login");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to delete this booking?")) {
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const response = await fetch(`${BASE_URL}/api/bookings/${bookingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Refresh bookings after deletion
        fetchBookings(token);
      } else {
        alert("Failed to delete booking");
      }
    } catch (error) {
      console.error("Error deleting booking:", error);
    }
  };

  // Filter bookings based on search, date, and status
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.Phone.includes(searchTerm);

    const matchesDate = selectedDate
      ? new Date(booking.StartTime).toISOString().split("T")[0] === selectedDate
      : true;

    const matchesStatus =
      selectedStatus === "all" || booking.Status === selectedStatus;

    return matchesSearch && matchesDate && matchesStatus;
  });

  // Group bookings by date
  const groupedBookings = filteredBookings.reduce((groups, booking) => {
    const date = new Date(booking.StartTime).toISOString().split("T")[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(booking);
    return groups;
  }, {} as Record<string, Booking[]>);

  // Get unique dates for filter
  const uniqueDates = [
    ...new Set(
      bookings.map((b) => new Date(b.StartTime).toISOString().split("T")[0])
    ),
  ]
    .sort()
    .reverse();

  // Get status counts
  const statusCounts = bookings.reduce((counts, booking) => {
    counts[booking.Status] = (counts[booking.Status] || 0) + 1;
    counts.total = (counts.total || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  return (
    <main
      style={{
        padding: "20px",
        maxWidth: "1200px",
        margin: "0 auto",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "40px",
          padding: "20px",
          backgroundColor: "white",
          borderRadius: "10px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "2.5rem",
              margin: 0,
              color: "#333",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span>📊</span> Admin Dashboard
          </h1>
          <p style={{ color: "#666", marginTop: "5px" }}>
            Manage all service bookings
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              backgroundColor: "#f8f9fa",
              padding: "10px 20px",
              borderRadius: "8px",
            }}
          >
            <div style={{ fontSize: "0.9rem", color: "#666" }}>
              Total Bookings
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                color: "#0070f3",
              }}
            >
              {bookings.length}
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: "10px 25px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "600",
              transition: "background-color 0.2s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#c82333")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#dc3545")
            }
          >
            Logout
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "10px" }}>👥</div>
          <div
            style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#0070f3" }}
          >
            {uniqueDates.length}
          </div>
          <div style={{ color: "#666" }}>Days with Bookings</div>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          backgroundColor: "white",
          padding: "25px",
          borderRadius: "10px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          marginBottom: "30px",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>
          Filters
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
          }}
        >
          <div>
            <label
              style={{ display: "block", marginBottom: "8px", color: "#666" }}
            >
              Search by Name or Phone
            </label>
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "12px 15px",
                fontSize: "1rem",
                border: "2px solid #e9ecef",
                borderRadius: "8px",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{ display: "block", marginBottom: "8px", color: "#666" }}
            >
              Filter by Date
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: "12px 15px",
                fontSize: "1rem",
                border: "2px solid #e9ecef",
                borderRadius: "8px",
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "white",
              }}
            >
              <option value="">All Dates</option>
              {uniqueDates.map((date) => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{ display: "block", marginBottom: "8px", color: "#666" }}
            >
              Filter by Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: "12px 15px",
                fontSize: "1rem",
                border: "2px solid #e9ecef",
                borderRadius: "8px",
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "white",
              }}
            >
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div
        style={{
          backgroundColor: "white",
          padding: "25px",
          borderRadius: "10px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "25px",
          }}
        >
          <h3 style={{ margin: 0, color: "#333" }}>
            Bookings ({filteredBookings.length})
          </h3>
          {filteredBookings.length > 0 && (
            <button
              onClick={() =>
                fetchBookings(localStorage.getItem("access_token") || "")
              }
              style={{
                padding: "10px 20px",
                backgroundColor: "#0070f3",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              ↻ Refresh
            </button>
          )}
        </div>

        {isLoading ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "#666",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "10px" }}>⏳</div>
            Loading bookings...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "#666",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "10px" }}>📭</div>
            {searchTerm || selectedDate || selectedStatus !== "all"
              ? "No bookings match your filters"
              : "No bookings found"}
          </div>
        ) : (
          Object.entries(groupedBookings).map(([date, dateBookings]) => (
            <div key={date} style={{ marginBottom: "40px" }}>
              <div
                style={{
                  paddingBottom: "10px",
                  marginBottom: "20px",
                  borderBottom: "2px solid #e9ecef",
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    color: "#333",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span>📅</span>
                  {formatDate(date)}
                  <span
                    style={{
                      fontSize: "0.9rem",
                      backgroundColor: "#e7f1ff",
                      color: "#0070f3",
                      padding: "2px 8px",
                      borderRadius: "12px",
                    }}
                  >
                    {dateBookings.length} booking
                    {dateBookings.length !== 1 ? "s" : ""}
                  </span>
                </h4>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                  gap: "20px",
                }}
              >
                {dateBookings.map((booking) => (
                  <div
                    key={booking.ID}
                    style={{
                      backgroundColor: "#f8f9fa",
                      padding: "20px",
                      borderRadius: "10px",
                      borderLeft: "4px solid",
                      borderLeftColor:
                        booking.Status === "confirmed"
                          ? "#28a745"
                          : booking.Status === "pending"
                          ? "#ffc107"
                          : "#dc3545",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "10px",
                          }}
                        >
                          <h5
                            style={{
                              margin: 0,
                              fontSize: "1.2rem",
                              color: "#333",
                            }}
                          >
                            {booking.Name}
                          </h5>
                          <span
                            style={{
                              fontSize: "0.8rem",
                              backgroundColor:
                                booking.Status === "confirmed"
                                  ? "#d4edda"
                                  : booking.Status === "pending"
                                  ? "#fff3cd"
                                  : "#f8d7da",
                              color:
                                booking.Status === "confirmed"
                                  ? "#155724"
                                  : booking.Status === "pending"
                                  ? "#856404"
                                  : "#721c24",
                              padding: "3px 10px",
                              borderRadius: "12px",
                              textTransform: "capitalize",
                            }}
                          >
                            {booking.Status}
                          </span>
                        </div>

                        <div style={{ color: "#666", marginBottom: "5px" }}>
                          <strong>Phone:</strong> {booking.Phone}
                        </div>

                        <div style={{ color: "#666", marginBottom: "5px" }}>
                          <strong>Time:</strong> {formatTime(booking.StartTime)}{" "}
                          - {formatTime(booking.EndTime)}
                        </div>

                        <div style={{ color: "#666", fontSize: "0.9rem" }}>
                          <strong>Duration:</strong>{" "}
                          {Math.round(
                            (new Date(booking.EndTime).getTime() -
                              new Date(booking.StartTime).getTime()) /
                              (1000 * 60 * 60)
                          )}{" "}
                          hours
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <button
                          onClick={() => {
                            // You can implement edit functionality here
                            alert(`Edit booking: ${booking.ID}`);
                          }}
                          style={{
                            padding: "8px 15px",
                            backgroundColor: "#0070f3",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                          }}
                        >
                          ✏️ Edit
                        </button>

                        <button
                          onClick={() => handleDeleteBooking(booking.ID)}
                          style={{
                            padding: "8px 15px",
                            backgroundColor: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Note */}
      <div
        style={{
          textAlign: "center",
          marginTop: "30px",
          color: "#666",
          fontSize: "0.9rem",
        }}
      >
        <p>
          Last updated: {new Date().toLocaleString()} • Showing{" "}
          {filteredBookings.length} of {bookings.length} total bookings
        </p>
      </div>
    </main>
  );
}
