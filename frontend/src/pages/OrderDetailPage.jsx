import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import StatusBadge from "../components/StatusBadge";
import PhotoGrid from "../components/PhotoGrid";
import useAutoRefresh from '../useAutoRefresh'
import {
  DETERGENT_LABELS,
  STATUS_LABELS,
  dateTime,
  errorText,
  money,
} from "../utils";
import CustomerPaymentPanel from "../components/CustomerPaymentPanel";
import LaundryPhotosCard from "../components/LaundryPhotosCard";
import RiderTrackingCard from "../components/RiderTrackingCard";

const cardCls =
  "rounded-2xl border border-slate-200 bg-white shadow-sm";

const sectionCls = `${cardCls} p-4 sm:p-5`;

function PriceRow({ label, value, total }) {
  return (
    <tr className={total ? "" : "border-b border-slate-100"}>
      <td
        className={`py-2.5 ${
          total
            ? "pt-4 text-base font-bold text-slate-900"
            : "text-sm text-slate-600"
        }`}
      >
        {label}
      </td>

      <td
        className={`py-2.5 text-right ${
          total
            ? "pt-4 text-base font-bold text-blue-600"
            : "text-sm font-medium text-slate-800"
        }`}
      >
        {value}
      </td>
    </tr>
  );
}

function Place({ title, loc, type }) {
  const detail = [
    loc.building,
    loc.floor && `ชั้น ${loc.floor}`,
    loc.room && `ห้อง ${loc.room}`,
    loc.landmark,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
            type === "pickup"
              ? "bg-blue-50 text-blue-600"
              : "bg-green-50 text-green-600"
          }`}
        >
          {type === "pickup" ? "🧺" : "🏠"}
        </div>

        <div>
          <p className="text-xs text-slate-500">
            {title}
          </p>

          <p className="text-sm font-semibold text-slate-900">
            {type === "pickup" ? "จุดรับผ้า" : "จุดส่งผ้า"}
          </p>
        </div>
      </div>

      <p className="text-sm leading-5 text-slate-700">
        {loc.address}
      </p>

      {detail && (
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {detail}
        </p>
      )}

      <a
        href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-700"
      >
        📍 ดูบน Google Maps
      </a>
    </div>
  );
}

function SectionTitle({ eyebrow, title, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {eyebrow}
          </p>
        )}

        <h2 className="mt-0.5 text-base font-bold text-slate-900">
          {title}
        </h2>
      </div>

      {action}
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      api
        .get(`/orders/${id}`)
        .then((res) => setOrder(res.data))
        .catch((err) => setError(errorText(err))),
    [id],
  );

  useEffect(() => {
    load();
  }, [load]);

  const finished = order?.status === 'Completed' || order?.status === 'Cancelled'
  useAutoRefresh(async () => {
    try {
      const res = await api.get(`/orders/${id}`)
      setOrder(res.data)
    } catch { /* ข้ามรอบนี้ ไม่แสดง error ทับข้อความอื่นในหน้า */ }
  }, { interval: 5000, enabled: !!order && !finished })

  const cancel = async () => {
    if (!window.confirm("ยืนยันยกเลิกออเดอร์นี้?")) {
      return;
    }

    setError("");
    setBusy(true);

    try {
      const res = await api.post(`/orders/${id}/cancel`);
      setOrder(res.data);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (!order) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 lg:px-8">
        {error ? (
          <>
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>

            <Link
              to="/orders"
              className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← กลับไปรายการออเดอร์
            </Link>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            กำลังโหลด...
          </p>
        )}
      </div>
    );
  }

  const sizeText =
    order.finalSize &&
    order.finalSize !== order.estimatedSize
      ? `${order.estimatedSize} → ${order.finalSize}`
      : order.estimatedSize;

  const isTracking =
    order.status === "GoingToPickup" ||
    order.status === "Delivering";

  const canCancel = order.status === "Pending";

  return (
    <main className="mx-auto max-w-6xl px-3 py-4 pb-6 sm:px-6 sm:py-6 lg:px-8">

      {/* Back */}
      <div className="mb-3">
        <Link
          to="/orders"
          className="inline-flex items-center text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          ← ออเดอร์ของฉัน
        </Link>
      </div>

      {/* ================= HEADER ================= */}
      <section className={`${cardCls} overflow-hidden`}>

        {/* Order title */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
              #
            </div>

            <div className="min-w-0">
              <p className="text-xs text-slate-400">
                เลขที่ออเดอร์
              </p>

              <h1 className="truncate text-lg font-bold text-slate-900">
                {order.orderNo}
              </h1>
            </div>
          </div>

          <StatusBadge status={order.status} />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">

          <div className="min-w-0 px-4 py-3 sm:px-5">
            <p className="text-xs text-slate-400">
              บริการ
            </p>

            <p className="mt-1 truncate text-sm font-semibold text-slate-900">
              {order.serviceName}
            </p>
          </div>

          <div className="min-w-0 px-4 py-3 sm:px-5">
            <p className="text-xs text-slate-400">
              ไซส์
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-900">
              {sizeText}
            </p>
          </div>

          <div className="min-w-0 px-4 py-3 sm:px-5">
            <p className="text-xs text-slate-400">
              สั่งเมื่อ
            </p>

            <p className="mt-1 truncate text-sm font-medium text-slate-700">
              {dateTime(order.createdAt)}
            </p>
          </div>

          <div className="min-w-0 px-4 py-3 sm:px-5">
            <p className="text-xs text-slate-400">
              ยอดรวม
            </p>

            <p className="mt-1 text-sm font-bold text-blue-600">
              {money(order.totalPrice)}
            </p>
          </div>

        </div>

        {order.riderName && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 sm:px-5">
            <p className="text-xs text-slate-500">
              Rider:{" "}
              <span className="font-medium text-slate-800">
                {order.riderName}
              </span>
            </p>
          </div>
        )}

        {error && (
          <div className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:px-5">
            {error}
          </div>
        )}
      </section>

      {/* ================= TRACKING ================= */}
      {isTracking && (
        <section className="mt-4">
          <RiderTrackingCard
            orderId={order.id}
            status={order.status}
            pickup={order.pickupLocation}
            delivery={order.deliveryLocation}
          />
        </section>
      )}

      {/* ================= MAIN GRID ================= */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">

        {/* LEFT */}
        <div className="min-w-0 space-y-4">

          {/* STATUS */}
          <section className={sectionCls}>

            <SectionTitle
              eyebrow="ORDER PROGRESS"
              title="สถานะออเดอร์"
            />

            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-max items-start">
                {order.timeline.map((timeline, index) => {
                  const isLast =
                    index === order.timeline.length - 1;

                  return (
                    <div
                      key={index}
                      className="flex min-w-[120px] flex-1 items-start"
                    >
                      <div className="relative w-full">

                        <div className="flex items-center">
                          <div
                            className={`size-3 shrink-0 rounded-full ${
                              isLast
                                ? "bg-blue-600 ring-4 ring-blue-50"
                                : "bg-slate-300"
                            }`}
                          />

                          {!isLast && (
                            <div className="h-px flex-1 bg-slate-200" />
                          )}
                        </div>

                        <div className="pr-4 pt-2">
                          <p
                            className={`text-xs font-semibold ${
                              isLast
                                ? "text-slate-900"
                                : "text-slate-600"
                            }`}
                          >
                            {STATUS_LABELS[timeline.to] ??
                              timeline.to}
                          </p>

                          <p className="mt-1 whitespace-nowrap text-[11px] text-slate-400">
                            {dateTime(timeline.at)}
                          </p>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* DETAILS */}
          <section className={sectionCls}>

            <SectionTitle
              eyebrow="ORDER INFORMATION"
              title="รายละเอียดการซัก"
            />

            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">

              <div>
                <p className="text-xs text-slate-400">
                  บริการ
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {order.serviceName}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  ขนาด
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {sizeText}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  น้ำยา
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {DETERGENT_LABELS[
                    order.detergentSource
                  ] ?? order.detergentSource}
                </p>
              </div>

              {order.detergentNote && (
                <div>
                  <p className="text-xs text-slate-400">
                    รายละเอียดน้ำยา
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {order.detergentNote}
                  </p>
                </div>
              )}

            </div>

            {order.careNote && (
              <div className="mt-4 rounded-xl bg-slate-50 p-3.5">
                <p className="text-xs font-medium text-slate-500">
                  หมายเหตุการดูแลผ้า
                </p>

                <p className="mt-1 text-sm leading-5 text-slate-700">
                  {order.careNote}
                </p>
              </div>
            )}

          </section>

          {/* LOCATIONS */}
          <section className={sectionCls}>

            <SectionTitle
              eyebrow="LOCATIONS"
              title="จุดรับและจุดส่ง"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Place
                title="จุดรับผ้า"
                loc={order.pickupLocation}
                type="pickup"
              />

              <Place
                title="จุดส่งผ้า"
                loc={order.deliveryLocation}
                type="delivery"
              />
            </div>

          </section>

          {/* LAUNDRY PHOTOS */}
          <section className={sectionCls}>
            <LaundryPhotosCard
              orderId={order.id}
              status={order.status}
              images={order.images}
              onChanged={load}
            />
          </section>

          {/* ALL PHOTOS */}
          {order.images?.length > 0 && (
            <section className={sectionCls}>

              <SectionTitle
                eyebrow="DOCUMENTATION"
                title="รูปถ่ายทั้งหมด"
              />

              <PhotoGrid images={order.images} />
            </section>
          )}

        </div>

        {/* RIGHT */}
        <aside className="min-w-0 space-y-4">

          {/* PRICE */}
          <section className={sectionCls}>

            <SectionTitle
              eyebrow="PAYMENT"
              title="สรุปค่าใช้จ่าย"
            />

            <table className="w-full">
              <tbody>

                <PriceRow
                  label="ค่าซัก"
                  value={money(order.servicePrice)}
                />

                {order.lines.map((line, index) => (
                  <PriceRow
                    key={index}
                    label={`${line.name} × ${line.quantity}`}
                    value={money(line.lineTotal)}
                  />
                ))}

                <PriceRow
                  label="ค่าส่ง"
                  value={money(order.deliveryFee)}
                />

                {order.platformFee > 0 && (
                  <PriceRow
                    label="ค่าแพลตฟอร์ม"
                    value={money(order.platformFee)}
                  />
                )}

                <PriceRow
                  label="รวมทั้งหมด"
                  value={money(order.totalPrice)}
                  total
                />

              </tbody>
            </table>

          </section>

          {/* CANCEL */}
          {canCancel && (
            <section className="rounded-2xl border border-red-200 bg-red-50/50 p-4 sm:p-5">

              <p className="text-sm font-semibold text-slate-900">
                ต้องการยกเลิกออเดอร์?
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                สามารถยกเลิกได้ในขณะที่ออเดอร์ยังรอดำเนินการ
              </p>

              <button
                onClick={cancel}
                disabled={busy}
                className="mt-3 w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy
                  ? "กำลังยกเลิก..."
                  : "ยกเลิกออเดอร์"}
              </button>

            </section>
          )}

          {/* PAYMENT */}
          {(order.status === "Delivered" ||
            order.status === "Completed") && (
            <section className={sectionCls}>
              <CustomerPaymentPanel
                orderId={order.id}
                orderStatus={order.status}
                onChanged={load}
              />
            </section>
          )}

        </aside>
      </div>

    </main>
  );
}