"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import ReCAPTCHA from "react-google-recaptcha"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState({
    password: "",
    confirmPassword: "",
    recaptcha: "",
    general: "",
  })
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const recaptchaRef = React.useRef<ReCAPTCHA>(null)

  useEffect(() => {
    if (!token) {
      setErrors((prev) => ({ ...prev, general: "Invalid reset password token or expired" }))
      setTimeout(() => {
        router.push("/forgot-password")
      }, 2000)
    }
  }, [token, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Reset errors
    setErrors({
      password: "",
      confirmPassword: "",
      recaptcha: "",
      general: "",
    })

    if (!token) {
      setErrors((prev) => ({ ...prev, general: "Invalid reset password token or expired" }))
      return
    }

    if (!recaptchaToken) {
      setErrors((prev) => ({ ...prev, recaptcha: "Please complete the reCAPTCHA first" }))
      return
    }

    if (form.password !== form.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "Password and confirm password do not match" }))
      return
    }

    if (form.password.length < 6) {
      setErrors((prev) => ({ ...prev, password: "Password must be at least 6 characters" }))
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: form.password,
          recaptchaToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error?.toLowerCase().includes("token") || data.error?.toLowerCase().includes("expired")) {
          setErrors((prev) => ({ ...prev, general: data.error || "Invalid reset password token or expired" }))
        } else {
          setErrors((prev) => ({ ...prev, general: data.error || "An error occurred while resetting password" }))
        }
        recaptchaRef.current?.reset()
        setRecaptchaToken(null)
        setLoading(false)
        return
      }

      toast.success(data.message || "Password has been reset successfully")
      setSuccess(true)
      
      // Redirect ke login setelah 2 detik
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (error) {
      console.error("Reset password error:", error)
      setErrors((prev) => ({ ...prev, general: "An error occurred while resetting password" }))
      recaptchaRef.current?.reset()
      setRecaptchaToken(null)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {errors.general}
            </div>
          )}
          <p className="text-center text-gray-600">Redirecting to forgot password page...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md text-center">
          <div className="space-y-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Password has been reset succesfully
            </h2>
            <p className="text-gray-600">
              Your password has been reset succesfully. You will be redirected to the login page
            </p>
            <Link href="/login">
              <Button className="w-full">Back to login</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter you new password
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {errors.general}
              </div>
            )}
            <div>
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value })
                  if (errors.password) setErrors((prev) => ({ ...prev, password: "" }))
                }}
                placeholder="Enter you new password"
                className={`mt-1 ${errors.password ? "border-red-500" : ""}`}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => {
                  setForm({ ...form, confirmPassword: e.target.value })
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: "" }))
                }}
                placeholder="Repeat your new password"
                className={`mt-1 ${errors.confirmPassword ? "border-red-500" : ""}`}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey="6Lc7AQUsAAAAAKYlRkEoPYjYqXFmwhdXi4N7_JrS"
              onChange={(token) => {
                setRecaptchaToken(token)
                if (errors.recaptcha) setErrors((prev) => ({ ...prev, recaptcha: "" }))
              }}
            />
            {errors.recaptcha && (
              <p className="mt-2 text-sm text-red-600">{errors.recaptcha}</p>
            )}
          </div>

          <div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !recaptchaToken}
            >
              {loading ? "Mereset..." : "Reset Password"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}

