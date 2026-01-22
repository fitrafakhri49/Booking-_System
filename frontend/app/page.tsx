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
  duration: number;
}

export default function CafeBookingPage() {
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
  const [isClient, setIsClient] = useState(false);

  // Set isClient on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

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
    if (!BASE_URL || !isClient) return;

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
  }, [selectedDate, isClient]);

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

    const endHour = parseInt(endSlot.time.split(":")[0]) + 1;
    const endTime = `${endHour.toString().padStart(2, "0")}:00`;

    return {
      start_time: startSlot.time,
      end_time: endTime,
    };
  };

  // PDF Generation
  const generatePDF = () => {
    if (!confirmationData) return;

    setIsPrinting(true);

    const pdfContent = document.createElement("div");
    pdfContent.style.position = "absolute";
    pdfContent.style.left = "-9999px";
    pdfContent.style.width = "800px";
    pdfContent.style.padding = "40px";
    pdfContent.style.backgroundColor = "white";
    pdfContent.style.fontFamily = "'Poppins', Arial, sans-serif";

    const formatTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      const ampm = hours >= 12 ? "PM" : "AM";
      const hours12 = hours % 12 || 12;
      return `${hours12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
    };

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
      <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #d4a574;">
        <h1 style="color: #5d4037; margin: 0; font-size: 36px; font-weight: 700;">☕ Café Reserve</h1>
        <p style="color: #8d6e63; margin-top: 10px; font-size: 18px;">Table Booking Confirmation</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #6d4c41 0%, #8d6e63 100%); padding: 30px; border-radius: 15px; margin-bottom: 30px; color: white; box-shadow: 0 8px 25px rgba(109, 76, 65, 0.2);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
          <div>
            <h2 style="margin: 0; font-size: 28px; font-weight: 600;">${
              confirmationData.name
            }</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 16px;">📞 ${
              confirmationData.phone
            }</p>
          </div>
          <div style="background: rgba(255,255,255,0.15); padding: 12px 24px; border-radius: 50px; text-align: center; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);">
            <div style="font-size: 14px; opacity: 0.9;">Status</div>
            <div style="font-size: 18px; font-weight: bold;">CONFIRMED</div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 25px;">
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);">
            <div style="font-size: 14px; opacity: 0.9; display: flex; align-items: center; gap: 8px;">📅 Table Date</div>
            <div style="font-size: 20px; font-weight: bold; margin-top: 8px;">${formatDate(
              confirmationData.date
            )}</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);">
            <div style="font-size: 14px; opacity: 0.9; display: flex; align-items: center; gap: 8px;">⏰ Table Time</div>
            <div style="font-size: 20px; font-weight: bold; margin-top: 8px;">${formatTime(
              confirmationData.start_time
            )} - ${formatTime(confirmationData.end_time)}</div>
          </div>
        </div>
      </div>
      
      <div style="background: #f9f5f0; padding: 25px; border-radius: 12px; margin-bottom: 30px; border: 2px solid #e8dfd8;">
        <h3 style="color: #5d4037; margin-top: 0; margin-bottom: 15px;">Booking Details</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div>
            <strong style="color: #8d6e63;">Booking Date:</strong>
            <div>${formatDate(confirmationData.date)}</div>
          </div>
          <div>
            <strong style="color: #8d6e63;">Booking Time:</strong>
            <div>${confirmationData.bookingTime}</div>
          </div>
          <div>
            <strong style="color: #8d6e63;">Duration:</strong>
            <div>${confirmationData.duration} hour${
      confirmationData.duration > 1 ? "s" : ""
    }</div>
          </div>
          <div>
            <strong style="color: #8d6e63;">Reference ID:</strong>
            <div>${confirmationData.bookingId || "N/A"}</div>
          </div>
        </div>
      </div>
      
      <div style="border: 2px dashed #d4a574; padding: 25px; border-radius: 12px; margin-bottom: 30px; background-color: #fff8f1;">
        <h3 style="color: #5d4037; margin-top: 0; margin-bottom: 15px;">☕ Café Information</h3>
        <ul style="margin: 0; padding-left: 20px; color: #8d6e63;">
          <li>Please arrive 10 minutes before your reservation</li>
          <li>Table will be held for 15 minutes past reservation time</li>
          <li>Outside food and drinks are not permitted</li>
          <li>Contact us for special dietary requirements</li>
          <li>Free Wi-Fi available for all guests</li>
        </ul>
      </div>
      
      <div style="text-align: center; color: #8d6e63; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e8dfd8;">
        <p style="margin: 0 0 10px 0;">Thank you for choosing Café Reserve!</p>
        <p style="margin: 0; font-size: 12px; opacity: 0.7;">123 Coffee Street, Brew City | (123) 456-7890 | cafe@reserve.com</p>
      </div>
    `;

    document.body.appendChild(pdfContent);

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
            `Cafe-Booking-${confirmationData.name.replace(/\s+/g, "-")}-${
              confirmationData.date
            }.pdf`
          );

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
        const confirmation: BookingConfirmation = {
          ...bookingData,
          bookingId: data.id || Date.now().toString(),
          bookingTime: new Date().toLocaleString("en-US"),
          duration: selectedSlots.length,
        };

        setConfirmationData(confirmation);
        setShowConfirmation(true);

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
    if (!isClient) return date.toISOString().split("T")[0];

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format time for display
  const formatTime = (timeStr: string) => {
    if (!isClient) return timeStr;

    const [hours, minutes] = timeStr.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  // Show loading during SSR
  if (!isClient) {
    return (
      <main
        style={{
          minHeight: "100vh",
          backgroundColor: "#f9f5f0",
          fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{ textAlign: "center", padding: "100px", color: "#8d6e63" }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "20px" }}>☕</div>
          <div style={{ fontSize: "1.2rem" }}>Loading Café Booking...</div>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f9f5f0",
        fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
        padding: "20px",
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
              borderRadius: "15px",
              padding: "30px",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(109, 76, 65, 0.3)",
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
              <div>
                <h2 style={{ margin: 0, fontSize: "1.8rem", color: "#5d4037" }}>
                  ☕ Table Reserved!
                </h2>
                <p style={{ color: "#8d6e63", marginTop: "5px" }}>
                  Your table has been successfully booked
                </p>
              </div>
              <button
                onClick={() => setShowConfirmation(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#8d6e63",
                  padding: "5px",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                background: "linear-gradient(135deg, #6d4c41 0%, #8d6e63 100%)",
                padding: "25px",
                borderRadius: "12px",
                color: "white",
                marginBottom: "25px",
                boxShadow: "0 8px 25px rgba(109, 76, 65, 0.2)",
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
                    📞 {confirmationData.phone}
                  </p>
                </div>
                <div
                  style={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    fontWeight: "bold",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.2)",
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
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.9rem",
                      opacity: 0.9,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    📅 Table Date
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
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.9rem",
                      opacity: 0.9,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    ⏰ Table Time
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
                backgroundColor: "#f9f5f0",
                padding: "20px",
                borderRadius: "10px",
                marginBottom: "25px",
                border: "2px solid #e8dfd8",
              }}
            >
              <h4
                style={{ marginTop: 0, color: "#5d4037", marginBottom: "15px" }}
              >
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
                  <div style={{ color: "#8d6e63", fontSize: "0.9rem" }}>
                    Duration
                  </div>
                  <div style={{ fontWeight: "600", color: "#5d4037" }}>
                    {confirmationData.duration} hour
                    {confirmationData.duration > 1 ? "s" : ""}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#8d6e63", fontSize: "0.9rem" }}>
                    Booked On
                  </div>
                  <div style={{ fontWeight: "600", color: "#5d4037" }}>
                    {confirmationData.bookingTime}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#8d6e63", fontSize: "0.9rem" }}>
                    Reference ID
                  </div>
                  <div
                    style={{
                      fontWeight: "600",
                      fontFamily: "monospace",
                      color: "#5d4037",
                    }}
                  >
                    {confirmationData.bookingId || "N/A"}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                border: "2px dashed #d4a574",
                padding: "20px",
                borderRadius: "10px",
                marginBottom: "30px",
                backgroundColor: "#fff8f1",
              }}
            >
              <h4
                style={{
                  marginTop: 0,
                  color: "#5d4037",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>☕</span> Café Notes
              </h4>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#8d6e63" }}>
                <li>Please arrive 10 minutes before your reservation</li>
                <li>Table will be held for 15 minutes past reservation time</li>
                <li>Contact us for special dietary requirements</li>
                <li>Free Wi-Fi available for all guests</li>
              </ul>
            </div>

            <div
              style={{ display: "flex", gap: "15px", justifyContent: "center" }}
            >
              <button
                onClick={() => setShowConfirmation(false)}
                style={{
                  padding: "12px 25px",
                  backgroundColor: "#8d6e63",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "600",
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#6d4c41")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#8d6e63")
                }
              >
                Close
              </button>
              <button
                onClick={generatePDF}
                disabled={isPrinting}
                style={{
                  padding: "12px 25px",
                  backgroundColor: "#d4a574",
                  color: "#5d4037",
                  border: "none",
                  borderRadius: "8px",
                  cursor: isPrinting ? "not-allowed" : "pointer",
                  fontSize: "1rem",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: isPrinting ? 0.7 : 1,
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) =>
                  !isPrinting &&
                  (e.currentTarget.style.backgroundColor = "#c1935e")
                }
                onMouseLeave={(e) =>
                  !isPrinting &&
                  (e.currentTarget.style.backgroundColor = "#d4a574")
                }
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

      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "20px",
        }}
      >
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "40px",
            padding: "30px",
            backgroundColor: "white",
            borderRadius: "15px",
            boxShadow: "0 8px 25px rgba(109, 76, 65, 0.1)",
            border: "2px solid #e8dfd8",
          }}
        >
          <h1
            style={{
              fontSize: "2.8rem",
              marginBottom: "15px",
              color: "#5d4037",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "15px",
              fontWeight: "700",
            }}
          >
            <span style={{ fontSize: "3rem" }}>☕</span>
            Café Reserve
          </h1>
          <p style={{ color: "#8d6e63", fontSize: "1.2rem" }}>
            Book your perfect table experience
          </p>
        </div>

        {/* Calendar Navigation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
            padding: "25px",
            backgroundColor: "white",
            borderRadius: "15px",
            boxShadow: "0 8px 25px rgba(109, 76, 65, 0.1)",
            border: "2px solid #e8dfd8",
          }}
        >
          <button
            onClick={goToPreviousDay}
            style={{
              padding: "12px 25px",
              backgroundColor: "#8d6e63",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s ease",
              boxShadow: "0 4px 12px rgba(141, 110, 99, 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#6d4c41";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(141, 110, 99, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#8d6e63";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 12px rgba(141, 110, 99, 0.3)";
            }}
          >
            <span>←</span>
            Previous
          </button>

          <div style={{ textAlign: "center" }}>
            <h2
              style={{
                margin: 0,
                fontSize: "1.8rem",
                color: "#5d4037",
                fontWeight: "600",
              }}
            >
              {formatDate(selectedDate)}
            </h2>
            <button
              onClick={goToToday}
              style={{
                marginTop: "15px",
                padding: "10px 20px",
                backgroundColor: "#d4a574",
                color: "#5d4037",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "600",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 12px rgba(212, 165, 116, 0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#c1935e";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(212, 165, 116, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#d4a574";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(212, 165, 116, 0.3)";
              }}
            >
              Go to Today
            </button>
          </div>

          <button
            onClick={goToNextDay}
            style={{
              padding: "12px 25px",
              backgroundColor: "#8d6e63",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s ease",
              boxShadow: "0 4px 12px rgba(141, 110, 99, 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#6d4c41";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(141, 110, 99, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#8d6e63";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 12px rgba(141, 110, 99, 0.3)";
            }}
          >
            Next
            <span>→</span>
          </button>
        </div>

        {/* Time Slots Grid */}
        <div
          style={{
            marginBottom: "40px",
            backgroundColor: "white",
            borderRadius: "15px",
            overflow: "hidden",
            boxShadow: "0 8px 25px rgba(109, 76, 65, 0.1)",
            border: "2px solid #e8dfd8",
          }}
        >
          <div
            style={{
              padding: "25px",
              margin: 0,
              backgroundColor: "#f9f5f0",
              borderBottom: "2px solid #e8dfd8",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3
              style={{
                margin: 0,
                color: "#5d4037",
                fontSize: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span>⏰</span>
              Available Time Slots (9 AM - 5 PM)
            </h3>
            <div style={{ color: "#8d6e63", fontSize: "0.9rem" }}>
              Click to select table time
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "15px",
              padding: "25px",
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
                    padding: "25px 15px",
                    backgroundColor: slot.isBooked
                      ? "#f8d7da"
                      : isSelected
                      ? "#d4a574"
                      : "#f9f5f0",
                    color: slot.isBooked
                      ? "#721c24"
                      : isSelected
                      ? "#5d4037"
                      : "#8d6e63",
                    border: isSelected
                      ? "3px solid #c1935e"
                      : slot.isBooked
                      ? "3px solid #f5c6cb"
                      : "3px solid #e8dfd8",
                    borderRadius: "12px",
                    cursor: slot.isBooked ? "not-allowed" : "pointer",
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                    position: "relative",
                    minHeight: "100px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onMouseEnter={(e) => {
                    if (!slot.isBooked && !isSelected) {
                      e.currentTarget.style.backgroundColor = "#e8dfd8";
                      e.currentTarget.style.transform = "translateY(-5px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!slot.isBooked && !isSelected) {
                      e.currentTarget.style.backgroundColor = "#f9f5f0";
                      e.currentTarget.style.transform = "translateY(0)";
                    }
                  }}
                >
                  <div style={{ fontSize: "1.3rem", marginBottom: "8px" }}>
                    {slot.formattedTime}
                  </div>
                  {slot.isBooked && (
                    <div
                      style={{
                        fontSize: "0.8rem",
                        backgroundColor: "#dc3545",
                        color: "white",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        marginTop: "5px",
                        fontWeight: "600",
                      }}
                    >
                      Booked
                    </div>
                  )}
                  {isSelected && (
                    <div
                      style={{
                        fontSize: "0.8rem",
                        backgroundColor: "#5d4037",
                        color: "white",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        marginTop: "5px",
                        fontWeight: "600",
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
            borderRadius: "15px",
            boxShadow: "0 8px 25px rgba(109, 76, 65, 0.1)",
            marginBottom: "30px",
            border: "2px solid #e8dfd8",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: "25px",
              color: "#5d4037",
              fontSize: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span>📝</span>
            Your Information
          </h3>

          <div style={{ display: "grid", gap: "25px", marginBottom: "30px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "10px",
                  color: "#8d6e63",
                  fontWeight: "500",
                }}
              >
                👤 Your Name *
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{
                  padding: "15px",
                  fontSize: "1rem",
                  border: "2px solid #e8dfd8",
                  borderRadius: "10px",
                  width: "100%",
                  boxSizing: "border-box",
                  backgroundColor: "#f9f5f0",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#d4a574")}
                onBlur={(e) => (e.target.style.borderColor = "#e8dfd8")}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "10px",
                  color: "#8d6e63",
                  fontWeight: "500",
                }}
              >
                📞 Phone Number *
              </label>
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                style={{
                  padding: "15px",
                  fontSize: "1rem",
                  border: "2px solid #e8dfd8",
                  borderRadius: "10px",
                  width: "100%",
                  boxSizing: "border-box",
                  backgroundColor: "#f9f5f0",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#d4a574")}
                onBlur={(e) => (e.target.style.borderColor = "#e8dfd8")}
              />
            </div>
          </div>

          <div
            style={{
              padding: "20px",
              backgroundColor: "#fff8f1",
              borderRadius: "12px",
              marginBottom: "25px",
              border: "2px solid #f0e6d6",
            }}
          >
            <h4
              style={{
                margin: "0 0 15px 0",
                color: "#5d4037",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span>⏱️</span>
              Selected Time Range
            </h4>
            {getSelectedTimeRange() ? (
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "1.3rem",
                    color: "#8d6e63",
                    fontWeight: "600",
                  }}
                >
                  {getSelectedTimeRange()?.start_time} -{" "}
                  {getSelectedTimeRange()?.end_time}
                </p>
                <p style={{ margin: "10px 0 0 0", color: "#8d6e63" }}>
                  Duration: {selectedSlots.length} hour
                  {selectedSlots.length > 1 ? "s" : ""}
                </p>
              </div>
            ) : (
              <p style={{ margin: 0, color: "#8d6e63" }}>
                Please select time slots for your table reservation
              </p>
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
              padding: "18px 30px",
              backgroundColor: selectedSlots.length > 0 ? "#d4a574" : "#8d6e63",
              color: selectedSlots.length > 0 ? "#5d4037" : "white",
              border: "none",
              borderRadius: "12px",
              cursor: selectedSlots.length > 0 ? "pointer" : "not-allowed",
              fontSize: "1.2rem",
              fontWeight: "600",
              width: "100%",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 15px rgba(212, 165, 116, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
            }}
            onMouseEnter={(e) => {
              if (selectedSlots.length > 0) {
                e.currentTarget.style.backgroundColor = "#c1935e";
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow =
                  "0 8px 25px rgba(212, 165, 116, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedSlots.length > 0) {
                e.currentTarget.style.backgroundColor = "#d4a574";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 15px rgba(212, 165, 116, 0.3)";
              }
            }}
          >
            <span style={{ fontSize: "1.3rem" }}>☕</span>
            Reserve Table
          </button>
        </div>

        {/* Footer Note */}
        <div
          style={{
            textAlign: "center",
            color: "#8d6e63",
            fontSize: "0.9rem",
            padding: "20px",
            backgroundColor: "white",
            borderRadius: "10px",
            border: "2px solid #e8dfd8",
          }}
        >
          <p style={{ margin: 0 }}>
            ☕ Café Reserve • Operating Hours: 9:00 AM - 5:00 PM
          </p>
        </div>
      </div>
    </main>
  );
}
