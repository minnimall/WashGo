import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";
import PhotoGrid from "../components/PhotoGrid";
import PhotoUpload from "../components/PhotoUpload";
import RiderPaymentPanel from "../components/RiderPaymentPanel";
import RouteMap from "../components/RouteMap";
import StatusBadge from "../components/StatusBadge";
import useMyPosition from "../useMyPosition";
import useShareLocation from '../useShareLocation'
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
import { btn, ui } from "../ui";

const TO_PICKUP = ["Accepted", "GoingToPickup"];
const TO_DELIVERY = ["WashingCompleted", "Delivering"];
const SHARE_AT = ['GoingToPickup', 'Delivering'];

const mk = (loc, icon, color, label) => ({
    lat: loc.latitude,
    lng: loc.longitude,
    icon,
    color,
    label,
});

function Place({ title, loc }) {
    const detail = [
        loc.building,
        loc.floor && `ชั้น ${loc.floor}`,
        loc.room && `ห้อง ${loc.room}`,
        loc.landmark,
    ]
        .filter(Boolean)
        .join(" · ");
    return (
        <div>
        <strong className="text-gray-900">{title}</strong>
        <div>{loc.address}</div>
        {detail && <div className={ui.muted}>{detail}</div>}
        </div>
    );
}

export default function RiderJobDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    // โหมดแผนที่: ไปรับ / ไปส่ง (มีเส้นทางจากตำแหน่ง Rider) หรือแสดงหมุดสองจุดเฉยๆ
    const status = job?.status;
    const mapMode = TO_PICKUP.includes(status)
        ? "pickup"
        : TO_DELIVERY.includes(status)
        ? "delivery"
        : "both";
    const { pos, error: geoError } = useMyPosition(mapMode !== 'both')
    const sharing = useShareLocation(id, SHARE_AT.includes(status), pos)

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
        await api.post(`/rider/jobs/${id}/release`, { reason: reason.trim() });
        navigate("/rider/jobs");
        } catch (err) {
        setError(errorText(err));
        setBusy(false);
        }
    };

    if (!job) {
        return error ? (
        <>
            <div className={ui.error}>{error}</div>
            <Link to="/rider/jobs" className={ui.link}>
            ← กลับไปหน้างาน
            </Link>
        </>
        ) : (
        <p className={ui.muted}>กำลังโหลด...</p>
        );
    }

    const uploadTypes = Object.keys(IMAGE_AT).filter((t) =>
        IMAGE_AT[t].includes(job.status),
    );
    const next = job.next;
    const blocked = next?.requiredImage && !next.requiredImageDone;
    const hasImage = (t) => job.images.some((i) => i.type === t);
    const stepImages = job.images.filter((i) => uploadTypes.includes(i.type))
    const customerPhotos = job.images.filter((i) => i.type === 'CustomerLaundry')

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
        <>
        <p className="mb-3">
            <Link to="/rider/jobs" className={ui.link}>
            ← งาน
            </Link>
        </p>

        {/* ขั้นตอนปัจจุบัน: อัปโหลดรูปและปุ่มถัดไปอยู่ในการ์ดเดียวกัน ไม่ต้องเลื่อนหน้า */}
        <div className={ui.card}>
            <div className={ui.row}>
            <h1 className="text-2xl font-semibold text-gray-900">
                {job.orderNo}
            </h1>
            <StatusBadge status={job.status} />
            </div>
            <p className={`${ui.muted} mt-1`}>
            {job.serviceName} · ไซส์ {job.finalSize ?? job.estimatedSize} ·
            ยอดที่ลูกค้าจ่าย {money(job.totalPrice)}
            </p>
            {error && <div className={ui.error}>{error}</div>}

            {next && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-sm font-medium text-blue-800">ขั้นตอนถัดไป</p>
                <p className="mb-3 text-lg font-semibold text-gray-900">
                {NEXT_ACTION_LABELS[next.status] ?? next.status}
                </p>

                {uploadTypes.length > 0 && (
                <>
                    <ul className="mb-3 space-y-2">
                    {uploadTypes.map((t) => {
                        const required = t === next.requiredImage;
                        const done = required
                        ? next.requiredImageDone
                        : hasImage(t);
                        return (
                        <li
                            key={t}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2"
                        >
                            <span
                            className={done ? "text-green-700" : "text-gray-800"}
                            >
                            {done ? "✓" : "○"} {IMAGE_LABELS[t]}
                            {required && (
                                <span className="ml-1 text-xs text-red-600">
                                (จำเป็น)
                                </span>
                            )}
                            </span>
                            <PhotoUpload
                            label={done ? "ถ่ายเพิ่ม" : "ถ่ายรูป"}
                            onUpload={uploadPhoto(t)}
                            disabled={busy}
                            />
                        </li>
                        );
                    })}
                    </ul>
                    {stepImages.length > 0 && (
                    <div className="mb-3">
                        <PhotoGrid images={stepImages} />
                    </div>
                    )}
                </>
                )}

                <button
                className={`${btn("primary")} w-full sm:w-auto`}
                onClick={advance}
                disabled={busy || blocked}
                >
                {NEXT_ACTION_LABELS[next.status] ?? next.status}
                </button>
                {blocked && (
                <p className={`${ui.muted} mt-2`}>
                    ต้องอัปโหลด “{IMAGE_LABELS[next.requiredImage]}” ก่อนจึงกดได้
                </p>
                )}
            </div>
            )}

            {(job.status === "Delivered" || job.status === "Completed") && (
            <RiderPaymentPanel
                orderId={job.id}
                orderStatus={job.status}
                onChanged={load}
            />
            )}

            {job.canRelease && (
            <div className="mt-4">
                <button
                className={btn("danger", "sm")}
                onClick={release}
                disabled={busy}
                >
                ปล่อยงานคืน
                </button>
            </div>
            )}
        </div>

        {customerPhotos.length > 0 && (
            <div className={ui.card}>
            <h2 className={ui.h2}>รูปผ้าที่ลูกค้าถ่ายไว้</h2>
            <p className={`${ui.muted} mb-3`}>ใช้ตรวจว่าถุงหรือตะกร้าที่รับเป็นของลูกค้าคนนี้</p>
            <PhotoGrid images={customerPhotos} />
            </div>
        )}

        {showMap && (
            <div className={ui.card}>
            <div className={`${ui.row} mb-3`}>
                <h2 className="text-lg font-semibold text-gray-900">{mapTitle}</h2>
                <a
                className={btn("default", "sm")}
                href={`https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                >
                เปิดนำทางใน Google Maps
                </a>
            </div>
            <RouteMap
                from={mapMode === "both" ? null : pos}
                to={target}
                other={other}
            />
            {mapMode !== "both" && !pos && !geoError && (
                <p className={`${ui.muted} mt-2`}>กำลังหาตำแหน่งของคุณ...</p>
            )}
            {sharing && (
                <p className="mt-2 text-sm text-green-700">
                ● กำลังแชร์ตำแหน่งให้ลูกค้าเห็น (เฉพาะตอนไปรับผ้าและไปส่งผ้า)
                </p>
            )}
            {geoError && <div className={ui.error}>{geoError}</div>}
            </div>
        )}

        <div className={ui.card}>
            <h2 className={ui.h2}>ลูกค้าและสถานที่</h2>
            <p className="mb-3">
            ลูกค้า: {job.customerName}
            {job.customerPhone && (
                <>
                {" "}
                · โทร{" "}
                <a className={ui.link} href={`tel:${job.customerPhone}`}>
                    {job.customerPhone}
                </a>
                </>
            )}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
            <Place title="จุดรับผ้า" loc={job.pickupLocation} />
            <Place title="จุดส่งผ้า" loc={job.deliveryLocation} />
            </div>
        </div>

        <div className={ui.card}>
            <h2 className={ui.h2}>รายละเอียดงาน</h2>
            <p>
            น้ำยา: {DETERGENT_LABELS[job.detergentSource] ?? job.detergentSource}
            {job.detergentNote && ` (${job.detergentNote})`}
            </p>
            {job.careNote && <p>หมายเหตุการดูแลผ้า: {job.careNote}</p>}
            {job.lines.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
                {job.lines.map((l, i) => (
                <li key={i}>
                    {l.name} × {l.quantity}
                </li>
                ))}
            </ul>
            )}
        </div>

        <div className={ui.card}>
            <h2 className={ui.h2}>รูปถ่ายทั้งหมด</h2>
            <PhotoGrid images={job.images} />
        </div>

        <div className={ui.card}>
            <h2 className={ui.h2}>สถานะ</h2>
            <ul>
            {job.timeline.map((t, i) => (
                <li
                key={i}
                className="relative border-l-2 border-gray-200 pb-3 pl-4 last:pb-0 before:absolute before:-left-[7px] before:top-1.5 before:size-3 before:rounded-full before:bg-blue-600"
                >
                {STATUS_LABELS[t.to] ?? t.to}{" "}
                <span className={ui.muted}>· {dateTime(t.at)}</span>
                </li>
            ))}
            </ul>
        </div>
        </>
    );
}
