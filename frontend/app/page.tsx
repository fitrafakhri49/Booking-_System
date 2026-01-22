"use client";

import { useEffect, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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

interface BookingConfirmation {
  name: string;
  phone: string;
  date: string;
  start_time: string;
  end_time: string;
  bookingId?: string;
  bookingTime: string;
  duration: number; // ✅ TAMBAHAN
}

export default function BookingPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] =
    useState<BookingConfirmation | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

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

  const generatePDF = () => {
    if (!confirmationData) return;

    setIsPrinting(true);

    // Create a temporary div to render the PDF content
    const pdfContent = document.createElement("div");
    pdfContent.style.position = "absolute";
    pdfContent.style.left = "-9999px";
    pdfContent.style.width = "800px";
    pdfContent.style.padding = "40px";
    pdfContent.style.backgroundColor = "white";
    pdfContent.style.fontFamily = "Arial, sans-serif";

    // Format time
    const formatTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      const ampm = hours >= 12 ? "PM" : "AM";
      const hours12 = hours % 12 || 12;
      return `${hours12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
    };

    // Format date
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    pdfContent.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0070f3; margin: 0; font-size: 32px;">Service Booking Confirmation</h1>
        <p style="color: #666; margin-top: 10px;">Booking Reference: ${
          confirmationData.bookingId || "N/A"
        }</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; margin-bottom: 30px; color: white;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h2 style="margin: 0; font-size: 24px;">${
              confirmationData.name
            }</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">${
              confirmationData.phone
            }</p>
          </div>
          <div style="background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 10px; text-align: center;">
            <div style="font-size: 14px; opacity: 0.9;">Status</div>
            <div style="font-size: 18px; font-weight: bold;">CONFIRMED</div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px;">
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
            <div style="font-size: 14px; opacity: 0.9;">Service Date</div>
            <div style="font-size: 20px; font-weight: bold;">${formatDate(
              confirmationData.date
            )}</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
            <div style="font-size: 14px; opacity: 0.9;">Service Time</div>
            <div style="font-size: 20px; font-weight: bold;">${formatTime(
              confirmationData.start_time
            )} - ${formatTime(confirmationData.end_time)}</div>
          </div>
        </div>
      </div>
      
      <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 30px;">
        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">Booking Details</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div>
            <strong style="color: #666;">Booking Date:</strong>
            <div>${formatDate(confirmationData.date)}</div>
          </div>
          <div>
            <strong style="color: #666;">Booking Time:</strong>
            <div>${confirmationData.bookingTime}</div>
          </div>
          <div>
            <strong style="color: #666;">Service Duration:</strong>
            <div>
            ${confirmationData.duration} hour${
      confirmationData.duration > 1 ? "s" : ""
    }
          </div>
          
          </div>
          <div>
            <strong style="color: #666;">Reference ID:</strong>
            <div>${confirmationData.bookingId || "N/A"}</div>
          </div>
        </div>
      </div>
      
      <div style="border: 2px dashed #e9ecef; padding: 25px; border-radius: 10px; margin-bottom: 30px;">
        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">Service Information</h3>
        <ul style="margin: 0; padding-left: 20px; color: #555;">
          <li>Please arrive 10 minutes before your scheduled time</li>
          <li>Bring this confirmation with you</li>
          <li>Contact us if you need to reschedule</li>
          <li>Cancellations must be made 24 hours in advance</li>
        </ul>
      </div>
      
      <div style="text-align: center; color: #666; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9ecef;">
        <p>This is an automated booking confirmation. Please contact us for any changes.</p>
        <p>Thank you for choosing our service!</p>
      </div>
    `;

    document.body.appendChild(pdfContent);

    // Generate PDF
    setTimeout(() => {
      html2canvas(pdfContent, {
        scale: 2,
        useCORS: true,
        logging: false,
      })
        .then((canvas) => {
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
          });

          const imgWidth = 190;
          const pageHeight = pdf.internal.pageSize.getHeight();
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          let heightLeft = imgHeight;
          let position = 10;

          pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;

          while (heightLeft >= 0) {
            position = heightLeft - imgHeight + 10;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }

          pdf.save(
            `Booking-Confirmation-${confirmationData.name.replace(
              /\s+/g,
              "-"
            )}-${confirmationData.date}.pdf`
          );

          // Clean up
          document.body.removeChild(pdfContent);
          setIsPrinting(false);
        })
        .catch((error) => {
          console.error("Error generating PDF:", error);
          alert("Failed to generate PDF. Please try again.");
          document.body.removeChild(pdfContent);
          setIsPrinting(false);
        });
    }, 500);
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
        // Set confirmation data
        const confirmation: BookingConfirmation = {
          ...bookingData,
          bookingId: data.id || Date.now().toString(),
          bookingTime: new Date().toLocaleString(),
          duration: selectedSlots.length, // ✅ SIMPAN DI SINI
        };

        setConfirmationData(confirmation);
        setShowConfirmation(true);

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

  // Format time for display
  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  return (
    <main
      style={{
        padding: "40px 20px",
        maxWidth: "800px",
        margin: "0 auto",
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
      }}
    >
      {/* Booking Confirmation Modal */}
      {showConfirmation && confirmationData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "30px",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
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
              <h2 style={{ margin: 0, fontSize: "1.8rem", color: "#333" }}>
                🎉 Booking Confirmed!
              </h2>
              <button
                onClick={() => setShowConfirmation(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#666",
                  padding: "5px",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                padding: "25px",
                borderRadius: "10px",
                color: "white",
                marginBottom: "25px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "15px",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.5rem" }}>
                    {confirmationData.name}
                  </h3>
                  <p style={{ margin: "5px 0 0 0", opacity: 0.9 }}>
                    {confirmationData.phone}
                  </p>
                </div>
                <div
                  style={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    fontWeight: "bold",
                  }}
                >
                  CONFIRMED
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                  marginTop: "20px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "rgba(255,255,255,0.1)",
                    padding: "15px",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                    Service Date
                  </div>
                  <div
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: "bold",
                      marginTop: "5px",
                    }}
                  >
                    {formatDate(new Date(confirmationData.date))}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: "rgba(255,255,255,0.1)",
                    padding: "15px",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                    Service Time
                  </div>
                  <div
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: "bold",
                      marginTop: "5px",
                    }}
                  >
                    {formatTime(confirmationData.start_time)} -{" "}
                    {formatTime(confirmationData.end_time)}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#f8f9fa",
                padding: "20px",
                borderRadius: "10px",
                marginBottom: "25px",
              }}
            >
              <h4 style={{ marginTop: 0, color: "#333", marginBottom: "15px" }}>
                Booking Summary
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "15px",
                }}
              >
                <div>
                  <div style={{ color: "#666", fontSize: "0.9rem" }}>
                    Duration
                  </div>
                  <div style={{ fontWeight: "600" }}>
                    {confirmationData.duration} hour
                    {confirmationData.duration > 1 ? "s" : ""}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#666", fontSize: "0.9rem" }}>
                    Booked On
                  </div>
                  <div style={{ fontWeight: "600" }}>
                    {confirmationData.bookingTime}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#666", fontSize: "0.9rem" }}>
                    Reference ID
                  </div>
                  <div style={{ fontWeight: "600", fontFamily: "monospace" }}>
                    {confirmationData.bookingId || "N/A"}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                border: "2px dashed #e9ecef",
                padding: "20px",
                borderRadius: "10px",
                marginBottom: "30px",
              }}
            >
              <h4 style={{ marginTop: 0, color: "#333", marginBottom: "10px" }}>
                Important Notes
              </h4>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#555" }}>
                <li>Please arrive 10 minutes before your scheduled time</li>
                <li>Bring your confirmation with you</li>
                <li>Contact us if you need to reschedule</li>
                <li>Cancellations must be made 24 hours in advance</li>
              </ul>
            </div>

            <div
              style={{ display: "flex", gap: "15px", justifyContent: "center" }}
            >
              <button
                onClick={() => setShowConfirmation(false)}
                style={{
                  padding: "12px 25px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "600",
                }}
              >
                Close
              </button>
              <button
                onClick={generatePDF}
                disabled={isPrinting}
                style={{
                  padding: "12px 25px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: isPrinting ? "not-allowed" : "pointer",
                  fontSize: "1rem",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: isPrinting ? 0.7 : 1,
                }}
              >
                {isPrinting ? (
                  <>
                    <span>⏳</span>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <span>🖨️</span>
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </main>
  );
}
