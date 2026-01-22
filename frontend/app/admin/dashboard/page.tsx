"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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

interface AdminBookingForm {
  name: string;
  phone: string;
  date: string;
  start_time: string;
  end_time: string;
}

interface BookingConfirmation {
  name: string;
  phone: string;
  date: string;
  start_time: string;
  end_time: string;
  bookingId?: string;
  bookingTime: string;
  status: string;
  duration: number;
}

export default function CafeDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  // Use a fixed date format for initial state
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [adminForm, setAdminForm] = useState<AdminBookingForm>({
    name: "",
    phone: "",
    date: "", // Initialize empty, set in useEffect
    start_time: "09:00",
    end_time: "10:00",
  });

  const [adminLoading, setAdminLoading] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [confirmationData, setConfirmationData] =
    useState<BookingConfirmation | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const router = useRouter();

  // Set isClient and date only on client side
  useEffect(() => {
    setIsClient(true);
    // Set the date on client side only
    setAdminForm((prev) => ({
      ...prev,
      date: getTodayDate(),
    }));
  }, []);

  // Check authentication and fetch bookings
  useEffect(() => {
    if (!isClient) return; // Only run on client

    const token = localStorage.getItem("access_token");

    if (!token) {
      router.push("/admin/login");
      return;
    }

    fetchBookings(token);
  }, [router, isClient]);

  const fetchBookings = async (token: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/admin/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
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

  // FIX: Use fixed locale for date formatting
  const formatDate = (dateString: string) => {
    if (!isClient) return dateString; // Return raw string during SSR

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // FIX: Use consistent time formatting
  const formatTime = (timeStr: string) => {
    if (!isClient) return timeStr; // Return raw string during SSR

    try {
      const date = new Date(
        `1970-01-01T${timeStr.length === 5 ? timeStr : timeStr.slice(11, 16)}`
      );
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return timeStr;
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to delete this booking?")) {
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const response = await fetch(`${BASE_URL}/admin/booking/${bookingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchBookings(token);
      } else {
        alert("Failed to delete booking");
      }
    } catch (error) {
      console.error("Error deleting booking:", error);
    }
  };

  // PDF Generation Functions
  const generatePDF = () => {
    if (!confirmationData) return;

    setIsPrinting(true);

    const pdfContent = document.createElement("div");
    pdfContent.style.position = "absolute";
    pdfContent.style.left = "-9999px";
    pdfContent.style.width = "800px";
    pdfContent.style.padding = "40px";
    pdfContent.style.backgroundColor = "white";
    pdfContent.style.fontFamily = "Arial, sans-serif";

    const startHour = parseInt(confirmationData.start_time.split(":")[0]);
    const endHour = parseInt(confirmationData.end_time.split(":")[0]);
    const duration = endHour - startHour;

    const formatTimeForPDF = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      const ampm = hours >= 12 ? "PM" : "AM";
      const hours12 = hours % 12 || 12;
      return `${hours12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
    };

    const formatDateForPDF = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    pdfContent.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #d4a574;">
        <h1 style="color: #5d4037; margin: 0; font-size: 32px; font-weight: 700;">☕ Café Reserve</h1>
        <p style="color: #8d6e63; margin-top: 10px; font-size: 18px;">Table Booking ${
          confirmationData.status === "UPDATED" ? "Update" : "Confirmation"
        }</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #6d4c41 0%, #8d6e63 100%); padding: 30px; border-radius: 15px; margin-bottom: 30px; color: white; box-shadow: 0 8px 25px rgba(109, 76, 65, 0.2);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h2 style="margin: 0; font-size: 24px;">${
              confirmationData.name
            }</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">📞 ${
              confirmationData.phone
            }</p>
          </div>
          <div style="background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 10px; text-align: center; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);">
            <div style="font-size: 14px; opacity: 0.9;">Status</div>
            <div style="font-size: 18px; font-weight: bold;">${
              confirmationData.status
            }</div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px;">
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);">
            <div style="font-size: 14px; opacity: 0.9; display: flex; align-items: center; gap: 8px;">📅 Booking Date</div>
            <div style="font-size: 20px; font-weight: bold; margin-top: 5px;">${formatDateForPDF(
              confirmationData.date
            )}</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);">
            <div style="font-size: 14px; opacity: 0.9; display: flex; align-items: center; gap: 8px;">⏰ Table Time</div>
            <div style="font-size: 20px; font-weight: bold; margin-top: 5px;">${formatTimeForPDF(
              confirmationData.start_time
            )} - ${formatTimeForPDF(confirmationData.end_time)}</div>
          </div>
        </div>
      </div>
      
      <div style="background: #f9f5f0; padding: 25px; border-radius: 10px; margin-bottom: 30px; border: 2px solid #e8dfd8;">
        <h3 style="color: #5d4037; margin-top: 0; margin-bottom: 15px;">Booking Details</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div>
            <strong style="color: #8d6e63;">Booking Date:</strong>
            <div>${formatDateForPDF(confirmationData.date)}</div>
          </div>
          <div>
            <strong style="color: #8d6e63;">Booking Time:</strong>
            <div>${confirmationData.bookingTime}</div>
          </div>
          <div>
            <strong style="color: #8d6e63;">Duration:</strong>
            <div>${duration} hour${duration > 1 ? "s" : ""}</div>
          </div>
          <div>
            <strong style="color: #8d6e63;">Reference ID:</strong>
            <div>${confirmationData.bookingId || "N/A"}</div>
          </div>
          <div>
            <strong style="color: #8d6e63;">Action:</strong>
            <div>${
              confirmationData.status === "UPDATED"
                ? "Booking Updated"
                : "Booking Created"
            }</div>
          </div>
        </div>
      </div>
      
      <div style="border: 2px dashed #d4a574; padding: 25px; border-radius: 10px; margin-bottom: 30px; background-color: #fff8f1;">
        <h3 style="color: #5d4037; margin-top: 0; margin-bottom: 15px;">☕ Café Information</h3>
        <ul style="margin: 0; padding-left: 20px; color: #8d6e63;">
          <li>Please arrive 10 minutes before your reservation</li>
          <li>Table will be held for 15 minutes past reservation time</li>
          <li>Outside food and drinks are not permitted</li>
          <li>Contact us for special dietary requirements</li>
          ${
            confirmationData.status === "UPDATED"
              ? "<li><strong>Note:</strong> This is an updated booking confirmation</li>"
              : ""
          }
        </ul>
      </div>
      
      <div style="text-align: center; color: #8d6e63; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e8dfd8;">
        <p>Thank you for choosing Café Reserve!</p>
        <p style="font-size: 12px; opacity: 0.7;">123 Coffee Street, Brew City | (123) 456-7890</p>
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

          const action =
            confirmationData.status === "UPDATED" ? "Update" : "Confirmation";
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

  const showConfirmation = (data: BookingConfirmation) => {
    setConfirmationData(data);
    setShowConfirmationModal(true);
  };

  const handleOpenAdminModal = () => {
    setAdminForm({
      name: "",
      phone: "",
      date: getTodayDate(),
      start_time: "09:00",
      end_time: "10:00",
    });
    setShowAdminModal(true);
  };

  const handleOpenEditModal = (booking: Booking) => {
    setEditingBooking(booking);
    setAdminForm({
      name: booking.Name,
      phone: booking.Phone,
      date: booking.StartTime.split("T")[0],
      start_time: booking.StartTime.slice(11, 16),
      end_time: booking.EndTime.slice(11, 16),
    });
    setShowEditModal(true);
  };

  const handleAdminBooking = async () => {
    if (!adminForm.name.trim() || !adminForm.phone.trim()) {
      alert("Please fill in name and phone number");
      return;
    }

    if (!adminForm.date || !adminForm.start_time || !adminForm.end_time) {
      alert("Please select date and time range");
      return;
    }

    setAdminLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("Session expired. Please login again.");
        router.push("/admin/login");
        return;
      }

      const startHour = parseInt(adminForm.start_time.split(":")[0]);
      const endHour = parseInt(adminForm.end_time.split(":")[0]);

      if (endHour <= startHour) {
        alert("End time must be after start time");
        setAdminLoading(false);
        return;
      }

      const res = await fetch(`${BASE_URL}/booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(adminForm),
      });

      const data = await res.json();

      if (res.ok) {
        const duration = endHour - startHour;
        const confirmation: BookingConfirmation = {
          ...adminForm,
          bookingId: data.id || Date.now().toString(),
          bookingTime: new Date().toLocaleString("en-US"),
          status: "CONFIRMED",
          duration: duration,
        };

        showConfirmation(confirmation);
        setShowAdminModal(false);
        fetchBookings(token);

        setAdminForm({
          name: "",
          phone: "",
          date: getTodayDate(),
          start_time: "09:00",
          end_time: "10:00",
        });
      } else {
        alert(data.error || "Failed to create booking");
      }
    } catch (error) {
      alert("Error creating booking");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleUpdateBooking = async () => {
    if (!editingBooking) return;

    if (!adminForm.name.trim() || !adminForm.phone.trim()) {
      alert("Please fill in name and phone number");
      return;
    }

    if (!adminForm.date || !adminForm.start_time || !adminForm.end_time) {
      alert("Please select date and time range");
      return;
    }

    const startHour = parseInt(adminForm.start_time.split(":")[0]);
    const endHour = parseInt(adminForm.end_time.split(":")[0]);

    if (endHour <= startHour) {
      alert("End time must be after start time");
      return;
    }

    setEditLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("Session expired. Please login again.");
        router.push("/admin/login");
        return;
      }

      const res = await fetch(
        `${BASE_URL}/admin/booking/${editingBooking.ID}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: adminForm.name,
            phone: adminForm.phone,
            date: adminForm.date,
            start_time: adminForm.start_time,
            end_time: adminForm.end_time,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        const duration = endHour - startHour;
        const confirmation: BookingConfirmation = {
          ...adminForm,
          bookingId: editingBooking.ID,
          bookingTime: new Date().toLocaleString("en-US"),
          status: "UPDATED",
          duration: duration,
        };

        showConfirmation(confirmation);
        setShowEditModal(false);
        setEditingBooking(null);
        fetchBookings(token);
      } else {
        alert(data.error || "Failed to update booking");
      }
    } catch (err) {
      alert("Error updating booking");
    } finally {
      setEditLoading(false);
    }
  };

  const timeOptions = Array.from({ length: 9 }, (_, i) => {
    const hour = i + 9;
    return `${hour.toString().padStart(2, "0")}:00`;
  });

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

  const groupedBookings = filteredBookings.reduce((groups, booking) => {
    const date = new Date(booking.StartTime).toISOString().split("T")[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(booking);
    return groups;
  }, {} as Record<string, Booking[]>);

  const uniqueDates = [
    ...new Set(
      bookings.map((b) => new Date(b.StartTime).toISOString().split("T")[0])
    ),
  ]
    .sort()
    .reverse();

  const statusCounts = bookings.reduce((counts, booking) => {
    counts[booking.Status] = (counts[booking.Status] || 0) + 1;
    counts.total = (counts.total || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  // Show loading skeleton during SSR
  if (!isClient) {
    return (
      <main
        style={{
          padding: "20px",
          maxWidth: "1200px",
          margin: "0 auto",
          fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
          backgroundColor: "#f9f5f0",
          minHeight: "100vh",
        }}
      >
        <div
          style={{ textAlign: "center", padding: "100px", color: "#8d6e63" }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "20px" }}>☕</div>
          <div style={{ fontSize: "1.2rem" }}>Loading Café Dashboard...</div>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        padding: "20px",
        maxWidth: "1200px",
        margin: "0 auto",
        fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
        backgroundColor: "#f9f5f0",
        minHeight: "100vh",
      }}
    >
      {/* Rest of your JSX remains exactly the same */}
      {/* Just ensure all date/time formatting uses the isClient check */}

      {/* Booking Confirmation Modal - unchanged except for formatting functions */}
      {showConfirmationModal && confirmationData && (
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
                  {confirmationData.status === "UPDATED" ? "✏️" : "☕"}{" "}
                  {confirmationData.status === "UPDATED"
                    ? "Booking Updated!"
                    : "Table Confirmed!"}
                </h2>
                <p style={{ color: "#8d6e63", marginTop: "5px" }}>
                  {confirmationData.status === "UPDATED"
                    ? "Table reservation has been updated"
                    : "Your table has been reserved"}
                </p>
              </div>
              <button
                onClick={() => setShowConfirmationModal(false)}
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
                  {confirmationData.status}
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
                    {formatDate(confirmationData.date)}
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

            {/* ... rest of the modal ... */}
          </div>
        </div>
      )}

      {/* Admin Create Booking Modal - unchanged */}
      {/* Admin Create Booking Modal */}
      {showAdminModal && (
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
              maxWidth: "500px",
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
                  ☕ New Table Booking
                </h2>
                <p style={{ color: "#8d6e63", marginTop: "5px" }}>
                  Reserve a table for your café
                </p>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
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

            <div style={{ display: "grid", gap: "20px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#5d4037",
                    fontWeight: "600",
                  }}
                >
                  👤 Guest Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter guest name"
                  value={adminForm.name}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, name: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "12px 15px",
                    fontSize: "1rem",
                    border: "2px solid #e8dfd8",
                    borderRadius: "8px",
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
                    marginBottom: "8px",
                    color: "#5d4037",
                    fontWeight: "600",
                  }}
                >
                  📞 Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={adminForm.phone}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, phone: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "12px 15px",
                    fontSize: "1rem",
                    border: "2px solid #e8dfd8",
                    borderRadius: "8px",
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
                    marginBottom: "8px",
                    color: "#5d4037",
                    fontWeight: "600",
                  }}
                >
                  📅 Booking Date *
                </label>
                <input
                  type="date"
                  value={adminForm.date}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, date: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "12px 15px",
                    fontSize: "1rem",
                    border: "2px solid #e8dfd8",
                    borderRadius: "8px",
                    boxSizing: "border-box",
                    backgroundColor: "#f9f5f0",
                    transition: "border-color 0.2s ease",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#d4a574")}
                  onBlur={(e) => (e.target.style.borderColor = "#e8dfd8")}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      color: "#5d4037",
                      fontWeight: "600",
                    }}
                  >
                    ⏰ Start Time *
                  </label>
                  <select
                    value={adminForm.start_time}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      const startHour = parseInt(newStart.split(":")[0]);
                      const newEnd = `${(startHour + 1)
                        .toString()
                        .padStart(2, "0")}:00`;

                      setAdminForm({
                        ...adminForm,
                        start_time: newStart,
                        end_time: newEnd,
                      });
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 15px",
                      fontSize: "1rem",
                      border: "2px solid #e8dfd8",
                      borderRadius: "8px",
                      backgroundColor: "#f9f5f0",
                      transition: "border-color 0.2s ease",
                      cursor: "pointer",
                    }}
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {parseInt(time.split(":")[0]) <= 12
                          ? `${time} AM`
                          : `${parseInt(time.split(":")[0]) - 12}:00 PM`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      color: "#5d4037",
                      fontWeight: "600",
                    }}
                  >
                    ⏰ End Time *
                  </label>
                  <select
                    value={adminForm.end_time}
                    onChange={(e) =>
                      setAdminForm({ ...adminForm, end_time: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "12px 15px",
                      fontSize: "1rem",
                      border: "2px solid #e8dfd8",
                      borderRadius: "8px",
                      backgroundColor: "#f9f5f0",
                      transition: "border-color 0.2s ease",
                      cursor: "pointer",
                    }}
                  >
                    {timeOptions.map((time, index) => {
                      const hour = parseInt(time.split(":")[0]);
                      const startHour = parseInt(
                        adminForm.start_time.split(":")[0]
                      );
                      if (hour > startHour) {
                        return (
                          <option key={time} value={time}>
                            {hour <= 12 ? `${time} AM` : `${hour - 12}:00 PM`}
                          </option>
                        );
                      }
                      return null;
                    })}
                    <option value="18:00">6:00 PM</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "#fff8f1",
                  padding: "15px",
                  borderRadius: "8px",
                  marginTop: "10px",
                  border: "1px solid #f0e6d6",
                }}
              >
                <div style={{ color: "#8d6e63", fontSize: "0.9rem" }}>
                  <strong>⏱️ Time Range:</strong> {adminForm.start_time} -{" "}
                  {adminForm.end_time}
                  <br />
                  <small>Café hours: 09:00 - 18:00</small>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "15px",
                marginTop: "30px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowAdminModal(false)}
                disabled={adminLoading}
                style={{
                  padding: "12px 25px",
                  backgroundColor: "#8d6e63",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "600",
                  opacity: adminLoading ? 0.7 : 1,
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) =>
                  !adminLoading &&
                  (e.currentTarget.style.backgroundColor = "#6d4c41")
                }
                onMouseLeave={(e) =>
                  !adminLoading &&
                  (e.currentTarget.style.backgroundColor = "#8d6e63")
                }
              >
                Cancel
              </button>
              <button
                onClick={handleAdminBooking}
                disabled={adminLoading}
                style={{
                  padding: "12px 25px",
                  backgroundColor: "#d4a574",
                  color: "#5d4037",
                  border: "none",
                  borderRadius: "8px",
                  cursor: adminLoading ? "not-allowed" : "pointer",
                  fontSize: "1rem",
                  fontWeight: "600",
                  opacity: adminLoading ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) =>
                  !adminLoading &&
                  (e.currentTarget.style.backgroundColor = "#c1935e")
                }
                onMouseLeave={(e) =>
                  !adminLoading &&
                  (e.currentTarget.style.backgroundColor = "#d4a574")
                }
              >
                {adminLoading ? (
                  <>
                    <span>⏳</span>
                    Creating...
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    Reserve Table
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {showEditModal && editingBooking && (
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
              maxWidth: "500px",
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
                  ✏️ Edit Table Booking
                </h2>
                <p style={{ color: "#8d6e63", marginTop: "5px" }}>
                  Update reservation details
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingBooking(null);
                }}
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

            <div style={{ display: "grid", gap: "20px" }}>
              <div
                style={{
                  backgroundColor: "#fff8f1",
                  padding: "15px",
                  borderRadius: "8px",
                  marginBottom: "10px",
                  border: "1px solid #f0e6d6",
                }}
              >
                <div style={{ color: "#8d6e63", fontSize: "0.9rem" }}>
                  <strong>Booking ID:</strong> {editingBooking.ID}
                  <br />
                  <strong>Current Status:</strong> {editingBooking.Status}
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#5d4037",
                    fontWeight: "600",
                  }}
                >
                  👤 Guest Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter guest name"
                  value={adminForm.name}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, name: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "12px 15px",
                    fontSize: "1rem",
                    border: "2px solid #e8dfd8",
                    borderRadius: "8px",
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
                    marginBottom: "8px",
                    color: "#5d4037",
                    fontWeight: "600",
                  }}
                >
                  📞 Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={adminForm.phone}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, phone: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "12px 15px",
                    fontSize: "1rem",
                    border: "2px solid #e8dfd8",
                    borderRadius: "8px",
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
                    marginBottom: "8px",
                    color: "#5d4037",
                    fontWeight: "600",
                  }}
                >
                  📅 Booking Date *
                </label>
                <input
                  type="date"
                  value={adminForm.date}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, date: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "12px 15px",
                    fontSize: "1rem",
                    border: "2px solid #e8dfd8",
                    borderRadius: "8px",
                    boxSizing: "border-box",
                    backgroundColor: "#f9f5f0",
                    transition: "border-color 0.2s ease",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#d4a574")}
                  onBlur={(e) => (e.target.style.borderColor = "#e8dfd8")}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      color: "#5d4037",
                      fontWeight: "600",
                    }}
                  >
                    ⏰ Start Time *
                  </label>
                  <select
                    value={adminForm.start_time}
                    onChange={(e) =>
                      setAdminForm({ ...adminForm, start_time: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "12px 15px",
                      fontSize: "1rem",
                      border: "2px solid #e8dfd8",
                      borderRadius: "8px",
                      backgroundColor: "#f9f5f0",
                      transition: "border-color 0.2s ease",
                      cursor: "pointer",
                    }}
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {parseInt(time.split(":")[0]) <= 12
                          ? `${time} AM`
                          : `${parseInt(time.split(":")[0]) - 12}:00 PM`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      color: "#5d4037",
                      fontWeight: "600",
                    }}
                  >
                    ⏰ End Time *
                  </label>
                  <select
                    value={adminForm.end_time}
                    onChange={(e) =>
                      setAdminForm({ ...adminForm, end_time: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "12px 15px",
                      fontSize: "1rem",
                      border: "2px solid #e8dfd8",
                      borderRadius: "8px",
                      backgroundColor: "#f9f5f0",
                      transition: "border-color 0.2s ease",
                      cursor: "pointer",
                    }}
                  >
                    {timeOptions
                      .filter((time) => {
                        const hour = parseInt(time.split(":")[0]);
                        const startHour = parseInt(
                          adminForm.start_time.split(":")[0]
                        );
                        return hour > startHour;
                      })
                      .map((time) => (
                        <option key={time} value={time}>
                          {parseInt(time.split(":")[0]) <= 12
                            ? `${time} AM`
                            : `${parseInt(time.split(":")[0]) - 12}:00 PM`}
                        </option>
                      ))}
                    <option value="18:00">6:00 PM</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "#fff8f1",
                  padding: "15px",
                  borderRadius: "8px",
                  marginTop: "10px",
                  border: "1px solid #f0e6d6",
                }}
              >
                <div style={{ color: "#8d6e63", fontSize: "0.9rem" }}>
                  <strong>⏱️ Time Range:</strong> {adminForm.start_time} -{" "}
                  {adminForm.end_time}
                  <br />
                  <small>Café hours: 09:00 - 18:00</small>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "15px",
                marginTop: "30px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingBooking(null);
                }}
                disabled={editLoading}
                style={{
                  padding: "12px 25px",
                  backgroundColor: "#8d6e63",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "600",
                  opacity: editLoading ? 0.7 : 1,
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) =>
                  !editLoading &&
                  (e.currentTarget.style.backgroundColor = "#6d4c41")
                }
                onMouseLeave={(e) =>
                  !editLoading &&
                  (e.currentTarget.style.backgroundColor = "#8d6e63")
                }
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateBooking}
                disabled={editLoading}
                style={{
                  padding: "12px 25px",
                  backgroundColor: "#d4a574",
                  color: "#5d4037",
                  border: "none",
                  borderRadius: "8px",
                  cursor: editLoading ? "not-allowed" : "pointer",
                  fontSize: "1rem",
                  fontWeight: "600",
                  opacity: editLoading ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) =>
                  !editLoading &&
                  (e.currentTarget.style.backgroundColor = "#c1935e")
                }
                onMouseLeave={(e) =>
                  !editLoading &&
                  (e.currentTarget.style.backgroundColor = "#d4a574")
                }
              >
                {editLoading ? (
                  <>
                    <span>⏳</span>
                    Updating...
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    Update Booking
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Booking Modal - unchanged */}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "40px",
          padding: "25px",
          backgroundColor: "white",
          borderRadius: "15px",
          boxShadow: "0 8px 25px rgba(109, 76, 65, 0.1)",
          border: "2px solid #e8dfd8",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "2.5rem",
              margin: 0,
              color: "#5d4037",
              display: "flex",
              alignItems: "center",
              gap: "15px",
              fontWeight: "700",
            }}
          >
            <span style={{ fontSize: "2.8rem" }}>☕</span>
            Café Reserve Dashboard
          </h1>
          <p
            style={{ color: "#8d6e63", marginTop: "10px", fontSize: "1.1rem" }}
          >
            Manage table reservations and bookings
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button
            onClick={handleOpenAdminModal}
            style={{
              padding: "12px 25px",
              backgroundColor: "#d4a574",
              color: "#5d4037",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "10px",
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
            <span style={{ fontSize: "1.2rem" }}>➕</span>
            New Reservation
          </button>

          <div
            style={{
              backgroundColor: "#f9f5f0",
              padding: "15px 25px",
              borderRadius: "10px",
              border: "2px solid #e8dfd8",
              minWidth: "120px",
            }}
          >
            <div
              style={{
                fontSize: "0.9rem",
                color: "#8d6e63",
                fontWeight: "600",
              }}
            >
              Total Bookings
            </div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: "bold",
                color: "#5d4037",
                marginTop: "5px",
              }}
            >
              {bookings.length}
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: "12px 25px",
              backgroundColor: "#8d6e63",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "600",
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
            padding: "25px",
            borderRadius: "12px",
            boxShadow: "0 4px 15px rgba(109, 76, 65, 0.1)",
            textAlign: "center",
            border: "2px solid #e8dfd8",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "15px" }}>📅</div>
          <div
            style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#5d4037" }}
          >
            {uniqueDates.length}
          </div>
          <div
            style={{ color: "#8d6e63", marginTop: "5px", fontWeight: "500" }}
          >
            Days with Bookings
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          backgroundColor: "white",
          padding: "25px",
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
          <span>🔍</span>
          Filters & Search
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
              style={{
                display: "block",
                marginBottom: "10px",
                color: "#8d6e63",
                fontWeight: "500",
              }}
            >
              Search by Name or Phone
            </label>
            <input
              type="text"
              placeholder="Search reservations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "14px 15px",
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
              Filter by Date
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: "14px 15px",
                fontSize: "1rem",
                border: "2px solid #e8dfd8",
                borderRadius: "10px",
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "#f9f5f0",
                transition: "border-color 0.2s ease",
                cursor: "pointer",
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
              style={{
                display: "block",
                marginBottom: "10px",
                color: "#8d6e63",
                fontWeight: "500",
              }}
            >
              Filter by Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: "14px 15px",
                fontSize: "1rem",
                border: "2px solid #e8dfd8",
                borderRadius: "10px",
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "#f9f5f0",
                transition: "border-color 0.2s ease",
                cursor: "pointer",
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
          borderRadius: "15px",
          boxShadow: "0 8px 25px rgba(109, 76, 65, 0.1)",
          border: "2px solid #e8dfd8",
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
              <span>📋</span>
              Table Reservations ({filteredBookings.length})
            </h3>
            <p style={{ color: "#8d6e63", marginTop: "5px" }}>
              Managing café table bookings
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() =>
                fetchBookings(localStorage.getItem("access_token") || "")
              }
              style={{
                padding: "10px 20px",
                backgroundColor: "#f9f5f0",
                color: "#5d4037",
                border: "2px solid #e8dfd8",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#e8dfd8";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#f9f5f0";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <span>↻</span>
              Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px",
              color: "#8d6e63",
            }}
          >
            <div
              style={{
                fontSize: "3rem",
                marginBottom: "20px",
                animation: "pulse 2s infinite",
              }}
            >
              ☕
            </div>
            <div style={{ fontSize: "1.1rem" }}>
              Loading table reservations...
            </div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px",
              color: "#8d6e63",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "20px" }}>📭</div>
            <div style={{ fontSize: "1.1rem" }}>
              {searchTerm || selectedDate || selectedStatus !== "all"
                ? "No reservations match your filters"
                : "No table reservations found"}
            </div>
          </div>
        ) : (
          Object.entries(groupedBookings).map(([date, dateBookings]) => (
            <div key={date} style={{ marginBottom: "40px" }}>
              <div
                style={{
                  paddingBottom: "15px",
                  marginBottom: "25px",
                  borderBottom: "3px solid #e8dfd8",
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    color: "#5d4037",
                    display: "flex",
                    alignItems: "center",
                    gap: "15px",
                    fontSize: "1.3rem",
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>📅</span>
                  {formatDate(date)}
                  <span
                    style={{
                      fontSize: "0.9rem",
                      backgroundColor: "#fff8f1",
                      color: "#8d6e63",
                      padding: "6px 15px",
                      borderRadius: "20px",
                      fontWeight: "600",
                      border: "2px solid #f0e6d6",
                    }}
                  >
                    {dateBookings.length} reservation
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
                      backgroundColor: "#f9f5f0",
                      padding: "25px",
                      borderRadius: "12px",
                      borderLeft: "6px solid",
                      borderLeftColor:
                        booking.Status === "confirmed"
                          ? "#8d6e63"
                          : booking.Status === "pending"
                          ? "#d4a574"
                          : "#b71c1c",
                      boxShadow: "0 4px 12px rgba(109, 76, 65, 0.1)",
                      transition: "all 0.3s ease",
                      border: "2px solid #e8dfd8",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-5px)";
                      e.currentTarget.style.boxShadow =
                        "0 8px 25px rgba(109, 76, 65, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(109, 76, 65, 0.1)";
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
                            gap: "15px",
                            marginBottom: "15px",
                          }}
                        >
                          <h5
                            style={{
                              margin: 0,
                              fontSize: "1.3rem",
                              color: "#5d4037",
                              fontWeight: "600",
                            }}
                          >
                            {booking.Name}
                          </h5>
                          <span
                            style={{
                              fontSize: "0.8rem",
                              backgroundColor:
                                booking.Status === "confirmed"
                                  ? "#e8f5e8"
                                  : booking.Status === "pending"
                                  ? "#fff3cd"
                                  : "#f8d7da",
                              color:
                                booking.Status === "confirmed"
                                  ? "#2e7d32"
                                  : booking.Status === "pending"
                                  ? "#856404"
                                  : "#721c24",
                              padding: "5px 15px",
                              borderRadius: "20px",
                              textTransform: "capitalize",
                              fontWeight: "600",
                              border: "1px solid",
                              borderColor:
                                booking.Status === "confirmed"
                                  ? "#c8e6c9"
                                  : booking.Status === "pending"
                                  ? "#ffeaa7"
                                  : "#f5c6cb",
                            }}
                          >
                            {booking.Status}
                          </span>
                        </div>

                        <div
                          style={{
                            color: "#8d6e63",
                            marginBottom: "10px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span style={{ fontSize: "1.1rem" }}>📞</span>
                          <span>{booking.Phone}</span>
                        </div>

                        <div
                          style={{
                            color: "#8d6e63",
                            marginBottom: "10px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span style={{ fontSize: "1.1rem" }}>⏰</span>
                          <span>
                            {formatTime(booking.StartTime)} -{" "}
                            {formatTime(booking.EndTime)}
                          </span>
                        </div>

                        <div
                          style={{
                            color: "#8d6e63",
                            fontSize: "0.9rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span>⏱️</span>
                          <span>
                            <strong>Duration:</strong>{" "}
                            {Math.round(
                              (new Date(booking.EndTime).getTime() -
                                new Date(booking.StartTime).getTime()) /
                                (1000 * 60 * 60)
                            )}{" "}
                            hours
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <button
                          onClick={() => handleOpenEditModal(booking)}
                          style={{
                            padding: "10px 20px",
                            backgroundColor: "#f9f5f0",
                            color: "#5d4037",
                            border: "2px solid #d4a574",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#d4a574";
                            e.currentTarget.style.color = "white";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#f9f5f0";
                            e.currentTarget.style.color = "#5d4037";
                          }}
                        >
                          ✏️ Edit
                        </button>

                        <button
                          onClick={() => handleDeleteBooking(booking.ID)}
                          style={{
                            padding: "10px 20px",
                            backgroundColor: "#f9f5f0",
                            color: "#b71c1c",
                            border: "2px solid #f8d7da",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#b71c1c";
                            e.currentTarget.style.color = "white";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#f9f5f0";
                            e.currentTarget.style.color = "#b71c1c";
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
          marginTop: "40px",
          marginBottom: "20px",
          color: "#8d6e63",
          fontSize: "0.9rem",
          padding: "20px",
          backgroundColor: "white",
          borderRadius: "10px",
          border: "2px solid #e8dfd8",
        }}
      >
        <p style={{ margin: 0 }}>
          ☕ Café Reserve Management System • Last updated:{" "}
          {new Date().toLocaleString()} • Showing {filteredBookings.length} of{" "}
          {bookings.length} total reservations
        </p>
      </div>
    </main>
  );
}
