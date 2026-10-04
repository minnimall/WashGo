import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import StatusBadge from '../components/StatusBadge'
import { dateTime, errorText, money } from '../utils'

export default function OrdersPage() {
    const [data, setData] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        api.get('/orders')
            .then((res) => setData(res.data))
            .catch((err) => setError(errorText(err)))
    }, [])

    const orders = data?.items || []

    const totalOrders = data?.total || 0

    const activeOrders = orders.filter((order) =>
        ['Pending', 'Confirmed', 'Processing', 'Washing', 'Ready'].includes(order.status)
    ).length

    const completedOrders = orders.filter((order) =>
        ['Completed', 'Delivered'].includes(order.status)
    ).length

    return (
        <div className="space-y-8">

            {/* Hero Banner */}
            <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-7 sm:p-10 lg:p-12 text-white shadow-xl shadow-blue-500/10">

                {/* Background decoration */}
                <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10" />
                <div className="absolute -bottom-32 right-20 h-80 w-80 rounded-full bg-white/10" />
                <div className="absolute left-1/2 top-0 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />

                {/* Content */}
                <div className="relative z-10 max-w-2xl">

                    <p className="text-sm font-semibold tracking-wider text-blue-100">
                        WELCOME TO WASHGO
                    </p>

                    <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                        ซักผ้าให้เป็นเรื่องง่าย
                    </h1>

                    <p className="mt-4 max-w-xl text-sm leading-7 text-blue-100 sm:text-base">
                        จัดการบริการซักรีดของคุณได้ง่าย ๆ
                        ตั้งแต่การสั่งซัก ติดตามสถานะ
                        ไปจนถึงรับผ้ากลับคืน
                    </p>

                    <Link
                        to="/orders/new"
                        className="group mt-7 inline-flex items-center rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-blue-600 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                    >
                        สั่งซักผ้า
                        <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
                            →
                        </span>
                    </Link>

                </div>

                {/* 3D Laundry Illustration */}
                <div className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 lg:block">

                    <div className="relative h-64 w-64">

                        {/* Glow */}
                        <div className="absolute inset-4 rounded-full bg-cyan-300/20 blur-3xl" />

                        {/* Washing machine */}
                        <div className="absolute left-8 top-5 h-52 w-48 rotate-3 rounded-[32px] border border-white/20 bg-white/15 shadow-2xl backdrop-blur-md transition-transform duration-700 hover:rotate-0">

                            {/* Top panel */}
                            <div className="flex items-center gap-2 px-6 pt-5">
                                <div className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
                                <div className="h-2.5 w-2.5 rounded-full bg-white/40" />
                                <div className="ml-auto h-5 w-8 rounded-md bg-white/20" />
                            </div>

                            {/* Door */}
                            <div className="absolute left-8 top-14 flex h-32 w-32 items-center justify-center rounded-full bg-slate-200/90 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">

                                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-700 shadow-[inset_0_0_20px_rgba(255,255,255,0.25)]">

                                    <div className="h-12 w-12 rounded-full border-4 border-white/40" />

                                </div>

                            </div>

                        </div>

                        {/* Floating bubbles */}
                        <div className="absolute right-3 top-2 h-10 w-10 animate-bounce rounded-full border border-white/20 bg-white/20 backdrop-blur-md" />

                        <div className="absolute bottom-8 right-0 h-6 w-6 animate-pulse rounded-full bg-cyan-200/40" />

                        <div className="absolute left-0 top-24 h-5 w-5 animate-pulse rounded-full bg-white/30" />

                    </div>

                </div>
            </section>

            {/* Error */}
            {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
                    <span className="font-bold">!</span>
                    <span>{error}</span>
                </div>
            )}

            {/* Loading */}
            {!data && !error && (
                <div className="space-y-4">

                    <div className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
                        <div className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
                        <div className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
                    </div>

                </div>
            )}

            {/* Dashboard Content */}
            {data && (
                <>
                    {/* Statistics */}
                    <section className="grid gap-4 sm:grid-cols-3">

                        {/* Total */}
                        <div className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">

                            <div className="flex items-center justify-between">

                                <div>
                                    <p className="text-sm font-medium text-slate-500">
                                        ออเดอร์ทั้งหมด
                                    </p>

                                    <p className="mt-2 text-3xl font-black text-slate-900">
                                        {totalOrders}
                                    </p>
                                </div>

                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-600">
                                    #
                                </div>

                            </div>

                            <p className="mt-3 text-xs text-slate-400">
                                รายการที่คุณเคยสั่ง
                            </p>

                        </div>

                        {/* Active */}
                        <div className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">

                            <div className="flex items-center justify-between">

                                <div>
                                    <p className="text-sm font-medium text-slate-500">
                                        กำลังดำเนินการ
                                    </p>

                                    <p className="mt-2 text-3xl font-black text-slate-900">
                                        {activeOrders}
                                    </p>
                                </div>

                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-xl text-amber-500">
                                    ↻
                                </div>

                            </div>

                            <p className="mt-3 text-xs text-slate-400">
                                ออเดอร์ที่ยังไม่เสร็จ
                            </p>

                        </div>

                        {/* Completed */}
                        <div className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">

                            <div className="flex items-center justify-between">

                                <div>
                                    <p className="text-sm font-medium text-slate-500">
                                        ซักเสร็จแล้ว
                                    </p>

                                    <p className="mt-2 text-3xl font-black text-slate-900">
                                        {completedOrders}
                                    </p>
                                </div>

                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl text-emerald-500">
                                    ✓
                                </div>

                            </div>

                            <p className="mt-3 text-xs text-slate-400">
                                ออเดอร์ที่ดำเนินการเสร็จแล้ว
                            </p>

                        </div>

                    </section>

                    {/* Orders Section */}
                    <section>

                        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">

                            <div>
                                <p className="text-sm font-medium text-blue-600">
                                    YOUR ORDERS
                                </p>

                                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                                    ออเดอร์ล่าสุด
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    ติดตามรายการสั่งซักผ้าของคุณ
                                </p>
                            </div>

                            {data.total > 0 && (
                                <Link
                                    to="/orders"
                                    className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                                >
                                    ดูออเดอร์ทั้งหมด →
                                </Link>
                            )}

                        </div>

                        {/* Empty */}
                        {orders.length === 0 && (
                            <div className="relative overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">

                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-500">
                                    +
                                </div>

                                <h3 className="mt-5 text-lg font-bold text-slate-800">
                                    ยังไม่มีออเดอร์
                                </h3>

                                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                                    เริ่มต้นใช้บริการ WashGo
                                    ด้วยการสร้างออเดอร์ซักผ้ารายการแรกของคุณ
                                </p>

                                <Link
                                    to="/orders/new"
                                    className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md"
                                >
                                    สั่งซักผ้า
                                </Link>

                            </div>
                        )}

                        {/* Order List */}
                        {orders.length > 0 && (
                            <div className="space-y-3">

                                {orders.slice(0, 5).map((o) => (
                                    <Link
                                        to={`/orders/${o.id}`}
                                        key={o.id}
                                        className="group block rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md"
                                    >

                                        <div className="flex flex-wrap items-center justify-between gap-3">

                                            <div className="min-w-0">

                                                <div className="flex flex-wrap items-center gap-3">

                                                    <strong className="text-sm font-bold text-slate-900 sm:text-base">
                                                        {o.orderNo}
                                                    </strong>

                                                    <StatusBadge status={o.status} />

                                                </div>

                                                <p className="mt-2 text-sm text-slate-500">
                                                    {o.serviceName} · ไซส์ {o.size}
                                                </p>

                                            </div>

                                            <div className="text-right">

                                                <p className="text-base font-bold text-slate-900">
                                                    {money(o.totalPrice)}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-400">
                                                    {dateTime(o.createdAt)}
                                                </p>

                                            </div>

                                        </div>

                                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">

                                            <span className="text-xs text-slate-400">
                                                ดูรายละเอียดออเดอร์
                                            </span>

                                            <span className="text-sm font-semibold text-blue-600 transition-transform duration-300 group-hover:translate-x-1">
                                                →
                                            </span>

                                        </div>

                                    </Link>
                                ))}

                            </div>
                        )}

                        {/* More orders */}
                        {data.total > 5 && (
                            <div className="mt-5 text-center">
                                <Link
                                    to="/orders"
                                    className="inline-flex rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600 hover:shadow-sm"
                                >
                                    ดูออเดอร์ทั้งหมด
                                </Link>
                            </div>
                        )}

                    </section>

                    {/* Quick Action */}
                    <section className="grid gap-4 sm:grid-cols-2">

                        <Link
                            to="/orders/new"
                            className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                        >
                            <div className="relative z-10">

                                <p className="text-xs font-bold tracking-wider text-blue-600">
                                    QUICK ACTION
                                </p>

                                <h3 className="mt-2 text-lg font-bold text-slate-900">
                                    สั่งซักผ้าใหม่
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    สร้างออเดอร์ใหม่ได้ทันที
                                </p>

                                <span className="mt-4 inline-block text-sm font-semibold text-blue-600 transition-transform duration-300 group-hover:translate-x-1">
                                    เริ่มสั่งซัก →
                                </span>

                            </div>

                            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-50 transition-transform duration-500 group-hover:scale-125" />

                        </Link>

                        <Link
                            to="/locations"
                            className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                        >
                            <div className="relative z-10">

                                <p className="text-xs font-bold tracking-wider text-indigo-600">
                                    QUICK ACTION
                                </p>

                                <h3 className="mt-2 text-lg font-bold text-slate-900">
                                    จัดการที่อยู่
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    เพิ่มหรือแก้ไขที่อยู่สำหรับรับส่งผ้า
                                </p>

                                <span className="mt-4 inline-block text-sm font-semibold text-indigo-600 transition-transform duration-300 group-hover:translate-x-1">
                                    จัดการที่อยู่ →
                                </span>

                            </div>

                            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-50 transition-transform duration-500 group-hover:scale-125" />

                        </Link>

                    </section>

                </>
            )}

        </div>
    )
}