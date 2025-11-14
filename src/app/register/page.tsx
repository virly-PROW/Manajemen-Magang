"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import ReCAPTCHA from "react-google-recaptcha"

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    recaptcha: "",
    general: "",
  })
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const recaptchaRef = React.useRef<ReCAPTCHA>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Reset errors
    setErrors({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      recaptcha: "",
      general: "",
    })

    if (!recaptchaToken) {
      setErrors((prev) => ({ ...prev, recaptcha: "Please complete the reCAPTCHA" }))
      return
    }

    if (form.password !== form.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "Password do not match" }))
      return
    }

    if (form.password.length < 6) {
      setErrors((prev) => ({ ...prev, password: "Password must be at least 6 characters" }))
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
          recaptchaToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error?.includes("email") || data.error?.toLowerCase().includes("email")) {
          setErrors((prev) => ({ ...prev, email: data.error || "Email already in use" }))
        } else {
          setErrors((prev) => ({ ...prev, general: data.error || "An error occurred while registering" }))
        }
        recaptchaRef.current?.reset()
        setRecaptchaToken(null)
        setLoading(false)
        return
      }

      toast.success("Account created successfully")
      router.push("/login")
    } catch (error) {
      console.error("Register error:", error)
      setErrors((prev) => ({ ...prev, general: "An error occurred while registration" }))
      recaptchaRef.current?.reset()
      setRecaptchaToken(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create an account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Already have an account? Log in here
            </Link>
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
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value })
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }))
                }}
                placeholder="Enter your full name"
                className={`mt-1 ${errors.name ? "border-red-500" : ""}`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value })
                  if (errors.email) setErrors((prev) => ({ ...prev, email: "" }))
                }}
                placeholder="Enter your email"
                className={`mt-1 ${errors.email || errors.general ? "border-red-500" : ""}`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value })
                  if (errors.password) setErrors((prev) => ({ ...prev, password: "" }))
                }}
                placeholder="Enter your password"
                className={`mt-1 ${errors.password ? "border-red-500" : ""}`}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => {
                  setForm({ ...form, confirmPassword: e.target.value })
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: "" }))
                }}
                placeholder="Repeat your password"
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
              {loading ? "Registering..." : "Register"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

