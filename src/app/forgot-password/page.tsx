"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import ReCAPTCHA from "react-google-recaptcha";


export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [errors, setErrors] = useState({
    email: "",
    recaptcha: "",
    general: "",
  })
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const recaptchaRef = React.useRef<ReCAPTCHA>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Reset errors
    setErrors({
      email: "",
      recaptcha: "",
      general: "",
    })

    if (!recaptchaToken) {
      setErrors((prev) => ({ ...prev, recaptcha: "Please completed the reCAPTCHA first" }))
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          recaptchaToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error?.toLowerCase().includes("email") || data.error?.toLowerCase().includes("tidak ditemukan")) {
          setErrors((prev) => ({ ...prev, email: data.error || "Email not found" }))
        } else {
          setErrors((prev) => ({ ...prev, general: data.error || "An error occurred while sending reset password email" }))
        }
        recaptchaRef.current?.reset()
        setRecaptchaToken(null)
        setLoading(false)
        return
      }

      toast.success(data.message || "Link reset password has been sent to your email")
      setSent(true)
    } catch (error) {
      console.error("Forgot password error:", error)
      setErrors((prev) => ({ ...prev, general: "An error occurred while sending reset password email" }))
      recaptchaRef.current?.reset()
      setRecaptchaToken(null)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
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
              Email sent
            </h2>
            <p className="text-gray-600">
              If your email is registered, the reset password link has been sent to{" "}
              <strong>{email}</strong>. Please check your inbox.
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => {
                  setSent(false)
                  setEmail("")
                  recaptchaRef.current?.reset()
                  setRecaptchaToken(null)
                }}
                variant="outline"
                className="w-full"
              >
                Send again
              </Button>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Back to login 
                </Button>
              </Link>
            </div>
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
            Forgot password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email and we will send you a link to reset your password
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
                {errors.general}
              </div>
            )}
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors((prev) => ({ ...prev, email: "" }))
              }}
              placeholder="Enter your email"
              className={`mt-1 ${errors.email || errors.general ? "border-red-500" : ""}`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
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

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !recaptchaToken}
            >
              {loading ? "Sending..." : "Send yout link reset password"}
            </Button>

            <Link href="/login">
              <Button type="button" variant="outline" className="w-full">
                Back to log in
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}












