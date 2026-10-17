// กรอบหน้าตาเดียวกันสำหรับหน้า ลืมรหัสผ่าน / ตั้งรหัสผ่านใหม่ / ยืนยันอีเมล
export default function AuthShell({ title, subtitle, children }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f3f1ff] px-4 py-8">
            <div className="w-full max-w-md rounded-[28px] bg-white px-7 py-10 shadow-[0_25px_70px_rgba(76,61,145,0.18)] sm:px-10">
                <div className="flex justify-center">
                    <img src="/images/logo3.png" alt="WashGo" className="h-24 w-24 object-contain" />
                </div>
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
                    {subtitle && <p className="mt-2 text-xs text-slate-400 sm:text-sm">{subtitle}</p>}
                </div>
                {children}
            </div>
        </main>
    )
}