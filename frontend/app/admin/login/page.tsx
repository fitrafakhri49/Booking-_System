"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      router.push("/admin/dashboard");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
          },
          body: JSON.stringify({
            email: email.trim(),
            password: password.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error_description || "Invalid email or password");
      }

      // Save token
      localStorage.setItem("access_token", data.access_token);

      // Show success message briefly
      setError("");
      setIsLoading(false);

      // Redirect to dashboard
      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 500);
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
      setIsLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleDemoLogin = () => {
    setEmail("admin@example.com");
    setPassword("demo123");
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8f9fa",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "450px",
        }}
      >
        {/* Logo / Header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "80px",
              height: "80px",
              backgroundColor: "#0070f3",
              borderRadius: "50%",
              marginBottom: "20px",
              boxShadow: "0 4px 12px rgba(0, 112, 243, 0.3)",
            }}
          >
            <span
              style={{
                fontSize: "2.5rem",
                color: "white",
              }}
            >
              🔐
            </span>
          </div>
          <h1
            style={{
              fontSize: "2.5rem",
              margin: "0 0 10px 0",
              color: "#333",
              fontWeight: "700",
            }}
          >
            Admin Portal
          </h1>
          <p
            style={{
              color: "#666",
              margin: 0,
              fontSize: "1.1rem",
            }}
          >
            Sign in to manage bookings
          </p>
        </div>

        {/* Login Card */}
        <div
          style={{
            backgroundColor: "white",
            padding: "40px",
            borderRadius: "12px",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
            border: "1px solid #e9ecef",
          }}
        >
          {error && (
            <div
              style={{
                backgroundColor: "#f8d7da",
                color: "#721c24",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "1px solid #f5c6cb",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "25px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#333",
                  fontWeight: "600",
                  fontSize: "0.95rem",
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="admin@example.com"
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "15px",
                  fontSize: "1rem",
                  border: "2px solid #e9ecef",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s ease",
                  backgroundColor: isLoading ? "#f8f9fa" : "white",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#0070f3")}
                onBlur={(e) => (e.target.style.borderColor = "#e9ecef")}
              />
            </div>

            <div style={{ marginBottom: "30px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <label
                  style={{
                    color: "#333",
                    fontWeight: "600",
                    fontSize: "0.95rem",
                  }}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0070f3",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    padding: 0,
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="••••••••"
                  disabled={isLoading}
                  style={{
                    width: "100%",
                    padding: "15px",
                    fontSize: "1rem",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s ease",
                    backgroundColor: isLoading ? "#f8f9fa" : "white",
                    paddingRight: "50px",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#0070f3")}
                  onBlur={(e) => (e.target.style.borderColor = "#e9ecef")}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "16px",
                fontSize: "1.1rem",
                fontWeight: "600",
                backgroundColor: isLoading ? "#6c757d" : "#0070f3",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "background-color 0.2s ease",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
              }}
              onMouseEnter={(e) => {
                if (!isLoading)
                  e.currentTarget.style.backgroundColor = "#0056b3";
              }}
              onMouseLeave={(e) => {
                if (!isLoading)
                  e.currentTarget.style.backgroundColor = "#0070f3";
              }}
            >
              {isLoading ? (
                <>
                  <span>⏳</span>
                  Signing in...
                </>
              ) : (
                <>
                  <span>🔑</span>
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            marginTop: "40px",
            color: "#666",
            fontSize: "0.9rem",
          }}
        >
          <p style={{ margin: 0 }}>
            © {new Date().getFullYear()} Service Booking System • Admin Portal
          </p>
          <p style={{ margin: "5px 0 0 0" }}>
            Need help? Contact support@example.com
          </p>
        </div>

        {/* Security Note */}
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#e7f1ff",
            borderRadius: "8px",
            textAlign: "center",
            fontSize: "0.85rem",
            color: "#0056b3",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <span>🔒</span>
            <span>
              Your session is secured with industry-standard encryption
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
