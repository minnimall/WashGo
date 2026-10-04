import { STATUS_LABELS } from '../utils'

const tone = (s) =>
    s === 'Completed' ? 'ok' : s === 'Cancelled' ? 'off' : s === 'Pending' ? 'wait' : 'run'

export default function StatusBadge({ status }) {
    return <span className={`badge badge-${tone(status)}`}>{STATUS_LABELS[status] ?? status}</span>
}