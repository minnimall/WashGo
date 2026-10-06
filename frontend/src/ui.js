const base =
  'inline-flex items-center justify-center rounded-lg border font-medium cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50'

const variants = {
  default: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
  primary: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
  danger: 'border-red-300 bg-white text-red-700 hover:bg-red-50',
}

const sizes = {
  md: 'px-4 py-2 text-sm',
  sm: 'px-3 py-1 text-xs',
}

// ใช้กับทั้ง <button> และ <Link>: className={btn('primary')} / btn('danger', 'sm')
export const btn = (variant = 'default', size = 'md') =>
  `${base} ${variants[variant]} ${sizes[size]}`

const verifyBadges = {
  Registered: 'bg-gray-100 text-gray-600',
  PendingReview: 'bg-amber-100 text-amber-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Suspended: 'bg-red-100 text-red-700',
}

export const verifyBadge = (status) =>
  `inline-block rounded-full px-3 py-0.5 text-sm font-medium ${verifyBadges[status] ?? verifyBadges.Registered}`

export const ui = {
  h1: 'mb-4 text-2xl font-semibold text-gray-900',
  h2: 'mb-3 text-lg font-semibold text-gray-900',
  card: 'mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm',
  cardLink: 'mb-4 block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md',
  row: 'flex flex-wrap items-center justify-between gap-3',
  muted: 'text-sm text-gray-500',
  error: 'my-3 rounded-lg border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700',
  link: 'text-blue-600 hover:underline',
  label: 'mb-1 block text-sm font-medium text-gray-700',
  input:
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200',
  field: 'mb-4',
  tabs: 'mb-4 flex flex-wrap gap-2',
}