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
import useAutoRefresh from '../useAutoRefresh'
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
import ChatCard from '../components/ChatCard'
import ChatToggle from '../components/ChatToggle'

const TO_PICKUP = ["Accepted", "GoingToPickup"];
const TO_DELIVERY = ["WashingCompleted", "Delivering"];
const SHARE_AT = ["GoingToPickup", "Delivering"];

const mk = (loc, icon, color, label) => ({
  lat: loc.latitude,
  lng: loc.longitude,
  icon,
  color,
  label,
});

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
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-md text-sm ${
            type === "pickup"
              ? "bg-blue-50 text-blue-600"
              : "bg-green-50 text-green-600"
          }`}
        >
          {type === "pickup" ? "🧺" : "🏠"}
        </span>

        <p className="text-sm font-semibold text-gray-900">{title}</p>
      </div>

      <p className="text-sm leading-5 text-gray-700">{loc.address}</p>

      {detail && (
        <p className="mt-1 text-xs leading-5 text-gray-500">{detail}</p>
      )}
    </div>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-medium text-gray-900">
        {children}
      </span>
    </div>
  );
}

export default function RiderJobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false)

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
  useAutoRefresh(async () => {
    try {
      const res = await api.get(`/rider/jobs/${id}`)
      setJob(res.data)
    } catch { /* ข้ามรอบนี้ */ }
  }, { interval: 10000, enabled: !busy })
  
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
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {error ? (
          <>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>

            <Link
              to="/rider/jobs"
              className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← กลับไปหน้างาน
            </Link>
          </>
        ) : (
          <p className="text-sm text-gray-500">กำลังโหลด...</p>
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

  const showMap = job.status !== "Delivered" && job.status !== "Completed";

  const mapTitle =
    mapMode === "pickup"
      ? "เส้นทางไปจุดรับผ้า"
      : mapMode === "delivery"
        ? "เส้นทางไปจุดส่งผ้า"
        : "ตำแหน่งจุดรับและจุดส่ง";

  return (
    <main className="mx-auto max-w-7xl px-3 py-4 pb-24 sm:px-6 sm:py-6 lg:px-8 lg:pb-8">
      {/* Back */}
      <div className="mb-3">
        <Link
          to="/rider/jobs"
          className="inline-flex items-center text-sm font-medium text-gray-500 transition hover:text-gray-900"
        >
          ← งานของฉัน
        </Link>
      </div>

      {/* ================= HEADER ================= */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Order / Status */}
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-sm font-bold text-white">
              #
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500">เลขที่งาน</p>

              <h1 className="truncate text-lg font-bold text-gray-900">
                {job.orderNo}
              </h1>
            </div>
          </div>

          <StatusBadge status={job.status} />
          <ChatToggle orderId={job.id} me="Rider" open={chatOpen} onToggle={() => setChatOpen((v) => !v)} />
        </div>

        {chatOpen && (
          <ChatCard orderId={job.id} me="Rider" orderStatus={job.status} onClose={() => setChatOpen(false)} />
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 divide-x divide-gray-100 sm:grid-cols-4">
          <div className="min-w-0 px-4 py-3 sm:px-5">
            <p className="text-xs text-gray-500">บริการ</p>
            <p className="mt-1 truncate text-sm font-semibold text-gray-900">
              {job.serviceName}
            </p>
          </div>

          <div className="min-w-0 px-4 py-3 sm:px-5">
            <p className="text-xs text-gray-500">ขนาด</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {job.finalSize ?? job.estimatedSize}
            </p>
          </div>

          <div className="min-w-0 border-t border-gray-100 px-4 py-3 sm:border-t-0 sm:px-5">
            <p className="text-xs text-gray-500">ลูกค้า</p>
            <p className="mt-1 truncate text-sm font-semibold text-gray-900">
              {job.customerName}
            </p>
          </div>

          <div className="min-w-0 border-t border-gray-100 px-4 py-3 sm:border-t-0 sm:px-5">
            <p className="text-xs text-gray-500">ยอดชำระ</p>
            <p className="mt-1 text-sm font-bold text-gray-900">
              {money(job.totalPrice)}
            </p>
          </div>
        </div>

        {error && (
          <div className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:px-5">
            {error}
          </div>
        )}
      </section>

      {/* ================= NEXT ACTION ================= */}
      {next && (
        <section className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                →
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500">
                  ขั้นตอนถัดไป
                </p>

                <h2 className="mt-0.5 text-base font-bold text-gray-900 sm:text-lg">
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
              className={`${btn("primary")} w-full shrink-0 sm:w-auto`}
              onClick={advance}
              disabled={busy || blocked}
            >
              {NEXT_ACTION_LABELS[next.status] ?? next.status}
            </button>
          </div>

          {uploadTypes.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-4 sm:px-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">
                  รูปภาพประจำขั้นตอน
                </p>

                <span className="text-xs text-gray-400">
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
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs ${
                            done
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {done ? "✓" : "○"}
                        </span>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800">
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
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <PhotoGrid images={stepImages} />
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ================= MAIN CONTENT ================= */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_0.85fr]">
        {/* LEFT */}
        <div className="min-w-0 space-y-4">
          {/* MAP */}
          {showMap && (
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500">
                    NAVIGATION
                  </p>

                  <h2 className="mt-0.5 truncate text-base font-bold text-gray-900">
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
                  <p className="text-xs text-gray-500">
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

          {/* LOCATIONS */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500">LOCATIONS</p>

              <h2 className="mt-0.5 text-base font-bold text-gray-900">
                จุดรับและจุดส่ง
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Place title="จุดรับผ้า" loc={job.pickupLocation} type="pickup" />

              <Place
                title="จุดส่งผ้า"
                loc={job.deliveryLocation}
                type="delivery"
              />
            </div>
          </section>

          {/* CUSTOMER PHOTOS */}
          {customerPhotos.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3">
                <h2 className="text-base font-bold text-gray-900">
                  รูปผ้าจากลูกค้า
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  ใช้ตรวจสอบถุงหรือตะกร้าของลูกค้า
                </p>
              </div>

              <PhotoGrid images={customerPhotos} />
            </section>
          )}
        </div>

        {/* RIGHT */}
        <aside className="min-w-0 space-y-4">
          {/* CUSTOMER */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500">CUSTOMER</p>

              <h2 className="mt-0.5 text-base font-bold text-gray-900">
                ข้อมูลลูกค้า
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-600">
                {job.customerName?.charAt(0) ?? "C"}
              </div>

              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">
                  {job.customerName}
                </p>

                {job.customerPhone && (
                  <a
                    href={`tel:${job.customerPhone}`}
                    className="mt-0.5 block text-sm text-blue-600"
                  >
                    {job.customerPhone}
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* ORDER DETAILS */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-2">
              <p className="text-xs font-medium text-gray-500">ORDER DETAILS</p>

              <h2 className="mt-0.5 text-base font-bold text-gray-900">
                รายละเอียดงาน
              </h2>
            </div>

            <div className="divide-y divide-gray-100">
              <DetailRow label="น้ำยา">
                {DETERGENT_LABELS[job.detergentSource] ?? job.detergentSource}
              </DetailRow>

              {job.detergentNote && (
                <DetailRow label="รายละเอียดน้ำยา">
                  {job.detergentNote}
                </DetailRow>
              )}

              {job.careNote && (
                <div className="py-3">
                  <p className="mb-1 text-sm text-gray-500">
                    หมายเหตุการดูแลผ้า
                  </p>

                  <p className="text-sm leading-5 text-gray-800">
                    {job.careNote}
                  </p>
                </div>
              )}
            </div>

            {job.lines.length > 0 && (
              <div className="mt-2 border-t border-gray-100 pt-3">
                <p className="mb-2 text-xs font-medium text-gray-500">
                  รายการเพิ่มเติม
                </p>

                <div className="space-y-1.5">
                  {job.lines.map((line, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                    >
                      <span className="truncate text-gray-700">
                        {line.name}
                      </span>

                      <span className="ml-3 shrink-0 font-semibold text-gray-900">
                        × {line.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* PAYMENT */}
          {(job.status === "Delivered" || job.status === "Completed") && (
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <RiderPaymentPanel
                orderId={job.id}
                orderStatus={job.status}
                onChanged={load}
              />
            </section>
          )}

          {/* RELEASE */}
          {job.canRelease && (
            <section className="rounded-2xl border border-red-200 bg-red-50/50 p-4 sm:p-5">
              <p className="text-sm font-semibold text-gray-900">
                ไม่สามารถดำเนินงานต่อได้?
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                ปล่อยงานคืนเพื่อให้ Rider คนอื่นรับงานนี้ต่อ
              </p>

              <button
                className={`${btn("danger", "sm")} mt-3 w-full`}
                onClick={release}
                disabled={busy}
              >
                ปล่อยงานคืน
              </button>
            </section>
          )}
        </aside>
      </div>

      {/* ================= TIMELINE ================= */}
      <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500">ACTIVITY</p>

          <h2 className="mt-0.5 text-base font-bold text-gray-900">
            ประวัติสถานะงาน
          </h2>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-start">
            {job.timeline.map((timeline, index) => {
              const isLast = index === job.timeline.length - 1;

              return (
                <div
                  key={index}
                  className="flex min-w-[130px] flex-1 items-start"
                >
                  <div className="relative w-full">
                    <div className="flex items-center">
                      <div
                        className={`size-3 shrink-0 rounded-full ${
                          isLast
                            ? "bg-blue-600 ring-4 ring-blue-50"
                            : "bg-gray-300"
                        }`}
                      />

                      {!isLast && <div className="h-px flex-1 bg-gray-200" />}
                    </div>

                    <div className="pr-4 pt-2">
                      <p
                        className={`text-xs font-semibold ${
                          isLast ? "text-gray-900" : "text-gray-600"
                        }`}
                      >
                        {STATUS_LABELS[timeline.to] ?? timeline.to}
                      </p>

                      <p className="mt-1 whitespace-nowrap text-[11px] text-gray-400">
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

      

      {/* ================= ALL PHOTOS ================= */}
      <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500">DOCUMENTATION</p>
          <h2 className="mt-0.5 text-base font-bold text-gray-900">
            รูปถ่ายทั้งหมด
          </h2>
        </div>

        <PhotoGrid images={job.images} />
      </section>

      {/* ================= MOBILE ACTION BAR ================= */}
      {next && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden">
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
