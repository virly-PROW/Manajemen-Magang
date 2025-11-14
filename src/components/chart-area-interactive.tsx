"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

// contoh data dummy
const data = [
  { date: "Apr 7", visitors: 100 },
  { date: "Apr 14", visitors: 200 },
  { date: "Apr 21", visitors: 150 },
  { date: "Apr 28", visitors: 250 },
  { date: "May 5", visitors: 300 },
  { date: "May 12", visitors: 280 },
]

export function ChartArea() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="visitors"
          stroke="#000"
          fill="url(#colorVisitors)"
        />
        <defs>
          <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#000" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#000" stopOpacity={0} />
          </linearGradient>
        </defs>
      </AreaChart>
    </ResponsiveContainer>
  )
}

// 👉 Biar nggak error di tempat lain, tapi chart nggak tampil
export function ChartAreaInteractive() {
  return null
}
