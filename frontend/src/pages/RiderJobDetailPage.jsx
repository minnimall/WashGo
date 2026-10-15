import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";
import PhotoGrid from "../components/PhotoGrid";
import PhotoUpload from "../components/PhotoUpload";
import RiderPaymentPanel from "../components/RiderPaymentPanel";
import RouteMap from "../components/RouteMap";
import StatusBadge from "../components/StatusBadge";
import useMyPosition from "../useMyPosition";
import useShareLocation from "../useShareLocation";
import useAutoRefresh from "../useAutoRefresh";
import {
  DETERGENT_LABELS,
  IMAGE_AT,
  IMAGE_LABELS,
  NEXT_ACTION_LABELS,
  STATUS_LABELS,
  dateTime,
  errorText,
  money,
} from "../utils";
import { btn } from "../ui";
import ChatCard from "../components/ChatCard";
import ChatToggle from "../components/ChatToggle";

const TO_PICKUP = ["Accepted", "GoingToPickup"];
const TO_DELIVERY = ["WashingCompleted", "Delivering"];
const SHARE_AT = ["GoingToPickup", "Delivering"];

/* สไตล์ชุดเดียวกับหน้าออเดอร์ของลูกค้า */
const cardCls = "rounded-2xl border border-slate-200 bg-white shadow-sm";
const sectionCls = `${cardCls} p-4 sm:p-5`;

const mk = (loc, icon, color, label) => ({
  lat: loc.latitude,
  lng: loc.longitude,
  icon,
  color,
  label,
});

/* ---------- Small pieces (เหมือนฝั่งลูกค้า) ---------- */

function BackLink() {
  return (
    <Link
      to="/rider/jobs"
      className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-4 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <span className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-slate-900 group-hover:text-white">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5 transition-transform group-hover:-translate-x-0.5"
          aria-hidden="true"
        >
          <path d="M12 4 6 10l6 6" />
        </svg>
      </span>
      งานของฉัน
    </Link>
  );
}

function SectionTitle({ title, action }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {action}
    </div>
  );
}

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
        <p className="text-sm font-semibold text-slate-900">{title}</p>
      </div>

      <p className="text-sm leading-5 text-slate-700">{loc.address}</p>

      {detail && (
        <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
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

/* การ์ดลูกค้า + แชท (เหมือน RiderChatSection ฝั่งลูกค้า) */
function CustomerChatSection({ job, open, onToggle }) {
  const initial = job.customerName?.trim()?.charAt(0)?.toUpperCase() || "C";

  return (
    <section className={`${cardCls} overflow-hidden`}>
      <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-base font-bold text-white">
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">ลูกค้าของคุณ</p>
          <p className="truncate text-sm font-semibold text-slate-900">
            {job.customerName}
          </p>

          {job.customerPhone && (
            <a
              href={`tel:${job.customerPhone}`}
              className="mt-0.5 block text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              {job.customerPhone}
            </a>
          )}
        </div>

        <ChatToggle
          orderId={job.id}
          me="Rider"
          open={open}
          onToggle={onToggle}
        />
      </div>

      {open && (
        <div className="border-t border-slate-100">
          <ChatCard
            embedded
            orderId={job.id}
            me="Rider"
            orderStatus={job.status}
            onClose={onToggle}
          />
        </div>
      )}
    </section>
  );
}

/* ---------- Page ---------- */

export default function RiderJobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const status = job?.status;

  const mapMode = TO_PICKUP.includes(status)
    ? "pickup"
    : TO_DELIVERY.includes(status)
      ? "delivery"
      : "both";

  const { pos, error: geoError } = useMyPosition(mapMode !== "both");

  const sharing = useShareLocation(id, SHARE_AT.includes(status), pos);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/rider/jobs/${id}`);
      setJob(res.data);
    } catch (err) {
      setError(errorText(err));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // เช่น ลูกค้าเพิ่มรูปผ้าเข้ามา จะเห็นเอง (หยุดรอบนี้ชั่วคราวตอนกำลังกดปุ่มอยู่)
  useAutoRefresh(
    async () => {
      try {
        const res = await api.get(`/rider/jobs/${id}`);
        setJob(res.data);
      } catch {
        /* ข้ามรอบนี้ */
      }
    },
    { interval: 10000, enabled: !busy },
  );

  const uploadPhoto = (type) => async (file) => {
    const fd = new FormData();
    fd.append("type", type);
    fd.append("file", file);

    await api.post(`/rider/jobs/${id}/images`, fd);
    await load();
  };

  const advance = async () => {
    setError("");
    setBusy(true);

    try {
      const res = await api.post(`/rider/jobs/${id}/status`, {
        toStatus: job.next.status,
      });

      setJob(res.data);
    } catch (err) {
      setError(errorText(err));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const release = async () => {
    const reason = window.prompt(
      "เหตุผลที่ปล่อยงานคืน (งานจะกลับไปให้ Rider คนอื่นรับ)",
    );

    if (!reason?.trim()) return;

    setError("");
    setBusy(true);

    try {
      await api.post(`/rider/jobs/${id}/release`, {
        reason: reason.trim(),
      });

      navigate("/rider/jobs");
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  if (!job) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 lg:px-8">
        {error ? (
          <>
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
            <div className="mt-4">
              <BackLink />
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">กำลังโหลด...</p>
        )}
      </div>
    );
  }

  const uploadTypes = Object.keys(IMAGE_AT).filter((type) =>
    IMAGE_AT[type].includes(job.status),
  );

  const next = job.next;

  const blocked = next?.requiredImage && !next.requiredImageDone;

  const hasImage = (type) => job.images.some((image) => image.type === type);

  const stepImages = job.images.filter((image) =>
    uploadTypes.includes(image.type),
  );

  const customerPhotos = job.images.filter(
    (image) => image.type === "CustomerLaundry",
  );

  const pickup = mk(job.pickupLocation, "🧺", "#2563eb", "จุดรับผ้า");

  const drop = mk(job.deliveryLocation, "🏠", "#16a34a", "จุดส่งผ้า");

  const target = mapMode === "delivery" ? drop : pickup;
  const other = mapMode === "both" ? drop : null;

  const finished = job.status === "Delivered" || job.status === "Completed";
  const showMap = !finished;
  const showPayment = finished;

  const mapTitle =
    mapMode === "pickup"
      ? "เส้นทางไปจุดรับผ้า"
      : mapMode === "delivery"
        ? "เส้นทางไปจุดส่งผ้า"
        : "ตำแหน่งจุดรับและจุดส่ง";

  const sizeText =
    job.finalSize && job.finalSize !== job.estimatedSize
      ? `${job.estimatedSize} → ${job.finalSize}`
      : (job.finalSize ?? job.estimatedSize);

  return (
    <main className="mx-auto max-w-7xl px-3 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-8 lg:px-8">
      {/* Back */}
      <div className="mb-4">
        <BackLink />
      </div>

      <div className="space-y-8">
        {/* 1. HEADER: เลขงาน + สถานะ + สรุป */}
        <section className={`${cardCls} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                #
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">เลขที่งาน</p>
                <h1 className="truncate text-lg font-bold text-slate-900">
                  {job.orderNo}
                </h1>
              </div>
            </div>

            <StatusBadge status={job.status} />
          </div>

          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-500 sm:px-5">
            {job.serviceName} · {sizeText} · ลูกค้า {job.customerName} · ยอดชำระ{" "}
            {money(job.totalPrice)}
          </div>

          {error && (
            <div className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:px-5">
              {error}
            </div>
          )}
        </section>

        {/* 2. NEXT ACTION: สิ่งที่ Rider ต้องทำตอนนี้ */}
        {next && (
          <section className={cardCls}>
            <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  →
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">
                    ขั้นตอนถัดไป
                  </p>

                  <h2 className="mt-0.5 text-base font-bold text-slate-900 sm:text-lg">
                    {NEXT_ACTION_LABELS[next.status] ?? next.status}
                  </h2>

                  {blocked && (
                    <p className="mt-1 text-xs text-red-600">
                      ต้องอัปโหลด “{IMAGE_LABELS[next.requiredImage]}” ก่อน
                    </p>
                  )}
                </div>
              </div>

              <button
                className={`${btn("primary")} hidden w-full shrink-0 sm:block sm:w-auto`}
                onClick={advance}
                disabled={busy || blocked}
              >
                {NEXT_ACTION_LABELS[next.status] ?? next.status}
              </button>
            </div>

            {uploadTypes.length > 0 && (
              <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    รูปภาพประจำขั้นตอน
                  </p>

                  <span className="text-xs text-slate-400">
                    {uploadTypes.length} รายการ
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {uploadTypes.map((type) => {
                    const required = type === next.requiredImage;

                    const done = required
                      ? next.requiredImageDone
                      : hasImage(type);

                    return (
                      <div
                        key={type}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs ${
                              done
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {done ? "✓" : "○"}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {IMAGE_LABELS[type]}
                            </p>

                            {required && (
                              <p className="text-[11px] text-red-600">จำเป็น</p>
                            )}
                          </div>
                        </div>

                        <PhotoUpload
                          label={done ? "ถ่ายเพิ่ม" : "ถ่ายรูป"}
                          onUpload={uploadPhoto(type)}
                          disabled={busy}
                        />
                      </div>
                    );
                  })}
                </div>

                {stepImages.length > 0 && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <PhotoGrid images={stepImages} />
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* 3. PAYMENT: action สำคัญสุดตอนส่งผ้าเสร็จ */}
        {showPayment && (
          <section className={sectionCls}>
            <RiderPaymentPanel
              orderId={job.id}
              orderStatus={job.status}
              onChanged={load}
            />
          </section>
        )}

        {/* 4. NAVIGATION (แผนที่) + 5. CUSTOMER + CHAT */}
        {showMap && (
          <section className={`${cardCls} overflow-hidden`}>
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">NAVIGATION</p>

                <h2 className="mt-0.5 truncate text-base font-bold text-slate-900">
                  {mapTitle}
                </h2>
              </div>

              <a
                className={`${btn("default", "sm")} shrink-0`}
                href={`https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Maps
              </a>
            </div>

            <div className="h-[300px] sm:h-[380px] lg:h-[400px]">
              <RouteMap
                from={mapMode === "both" ? null : pos}
                to={target}
                other={other}
              />
            </div>

            <div className="space-y-2 px-4 py-3 sm:px-5">
              {mapMode !== "both" && !pos && !geoError && (
                <p className="text-xs text-slate-500">
                  กำลังค้นหาตำแหน่งของคุณ...
                </p>
              )}

              {sharing && (
                <p className="flex items-center gap-2 text-xs text-green-700">
                  <span className="size-2 rounded-full bg-green-500" />
                  กำลังแชร์ตำแหน่งให้ลูกค้าเห็น
                </p>
              )}

              {geoError && <p className="text-xs text-red-600">{geoError}</p>}
            </div>
          </section>
        )}

        <CustomerChatSection
          job={job}
          open={chatOpen}
          onToggle={() => setChatOpen((v) => !v)}
        />

        {/* MAIN GRID */}
        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          {/* LEFT */}
          <div className="min-w-0 space-y-4">
            {/* 6. TIMELINE */}
            <section className={sectionCls}>
              <SectionTitle title="ประวัติสถานะงาน" />

              <div className="overflow-x-auto pb-2">
                <div className="flex min-w-max items-start">
                  {job.timeline.map((timeline, index) => {
                    const isLast = index === job.timeline.length - 1;

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
                                isLast ? "text-slate-900" : "text-slate-600"
                              }`}
                            >
                              {STATUS_LABELS[timeline.to] ?? timeline.to}
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

            {/* 7. LOCATIONS */}
            <section className={sectionCls}>
              <SectionTitle title="จุดรับและจุดส่ง" />

              <div className="grid gap-3 sm:grid-cols-2">
                <Place
                  title="จุดรับผ้า"
                  loc={job.pickupLocation}
                  type="pickup"
                />
                <Place
                  title="จุดส่งผ้า"
                  loc={job.deliveryLocation}
                  type="delivery"
                />
              </div>
            </section>

            {/* 8. DETAILS */}
            <section className={sectionCls}>
              <SectionTitle title="รายละเอียดการซัก" />

              <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-400">บริการ</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {job.serviceName}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">ขนาด</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {sizeText}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">น้ำยา</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {DETERGENT_LABELS[job.detergentSource] ??
                      job.detergentSource}
                  </p>
                </div>

                {job.detergentNote && (
                  <div>
                    <p className="text-xs text-slate-400">รายละเอียดน้ำยา</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {job.detergentNote}
                    </p>
                  </div>
                )}
              </div>

              {job.careNote && (
                <div className="mt-4 rounded-xl bg-slate-50 p-3.5">
                  <p className="text-xs font-medium text-slate-500">
                    หมายเหตุการดูแลผ้า
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-700">
                    {job.careNote}
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT: 9. สรุปยอดชำระ (sticky บน desktop) */}
          <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
            <section className={sectionCls}>
              <SectionTitle title="สรุปยอดชำระ" />

              <table className="w-full">
                <tbody>
                  {job.lines.map((line, index) => (
                    <PriceRow
                      key={index}
                      label={line.name}
                      value={`× ${line.quantity}`}
                    />
                  ))}

                  <PriceRow
                    label="ยอดชำระรวม"
                    value={money(job.totalPrice)}
                    total
                  />
                </tbody>
              </table>
            </section>
          </aside>
        </div>

        {/* 10. PHOTOS: รวมเป็นการ์ดเดียว */}
        <section className={sectionCls}>
          {customerPhotos.length > 0 && (
            <div className="mb-5 border-b border-slate-100 pb-5">
              <SectionTitle title="รูปผ้าจากลูกค้า" />
              <p className="-mt-2 mb-3 text-xs text-slate-500">
                ใช้ตรวจสอบถุงหรือตะกร้าของลูกค้า
              </p>
              <PhotoGrid images={customerPhotos} />
            </div>
          )}

          <SectionTitle title="รูปถ่ายทั้งหมด" />
          <PhotoGrid images={job.images} />
        </section>

        {/* 11. RELEASE: ล่างสุด ไม่เด่น */}
        {job.canRelease && (
          <section className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                ไม่สามารถดำเนินงานต่อได้?
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                ปล่อยงานคืนเพื่อให้ Rider คนอื่นรับงานนี้ต่อ
              </p>
            </div>

            <button
              onClick={release}
              disabled={busy}
              className="w-full shrink-0 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              ปล่อยงานคืน
            </button>
          </section>
        )}
      </div>

      {/* MOBILE ACTION BAR (วางเหนือแถบเมนูล่างของ Layout) */}
      {next && (
        <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden">
          <button
            className={`${btn("primary")} w-full`}
            onClick={advance}
            disabled={busy || blocked}
          >
            {NEXT_ACTION_LABELS[next.status] ?? next.status}
          </button>
        </div>
      )}
    </main>
  );
}