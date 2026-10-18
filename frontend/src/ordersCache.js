import api from './api'

let cache = { uid: null, data: null }

export const getOrdersCache = (uid) => (uid && cache.uid === uid ? cache.data : null)
export const clearOrdersCache = () => { cache = { uid: null, data: null } }

export async function fetchOrders(uid) {
    const d = (await api.get('/orders')).data
    const next = Array.isArray(d)
        ? { items: d, total: d.length }
        : { items: d.items ?? [], total: d.total ?? d.items?.length ?? 0 }
    if (uid) cache = { uid, data: next }
    return next
}