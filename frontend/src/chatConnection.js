import {
    HubConnectionBuilder,
    HubConnectionState,
    LogLevel,
} from "@microsoft/signalr";

let connection = null;
let subscribers = 0;
let retryTimer = null;
let stopTimer = null;
const resyncHandlers = new Set();

function getConnection() {
    if (!connection) {
        connection = new HubConnectionBuilder()
            .withUrl("/hubs/chat") // ใช้ cookie ล็อกอินเดิม
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(LogLevel.Warning)
            .build();
        connection.onreconnected(() => resyncHandlers.forEach((fn) => fn()));
    }
    return connection;
}

function start() {
    const c = getConnection();
    if (subscribers === 0 || c.state !== HubConnectionState.Disconnected) return;
    c.start()
        .then(() => resyncHandlers.forEach((fn) => fn())) // ดึงข้อความที่อาจพลาดระหว่างรอเชื่อมต่อ
        .catch(() => {
            retryTimer = setTimeout(start, 5000);
        });
}

// handlers: { onMessage(orderId, dto), onRead(orderId), onResync() } คืนฟังก์ชันยกเลิก
export function subscribeChat({ onMessage, onRead, onResync }) {
    const c = getConnection();
    if (onMessage) c.on("chat:message", onMessage);
    if (onRead) c.on("chat:read", onRead);
    if (onResync) resyncHandlers.add(onResync);

    subscribers++;
    clearTimeout(stopTimer);
    clearTimeout(retryTimer);
    start();

    return () => {
        if (onMessage) c.off("chat:message", onMessage);
        if (onRead) c.off("chat:read", onRead);
        if (onResync) resyncHandlers.delete(onResync);

        subscribers--;
        if (subscribers === 0) {
            clearTimeout(retryTimer);
            stopTimer = setTimeout(() => {
                if (subscribers === 0) c.stop();
            }, 1000);
        }
    };
}
