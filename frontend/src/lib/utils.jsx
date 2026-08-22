// Shared utility helpers across the app

export const STATUS_META = {
  CREATED:           { label: 'Order Created',       icon: '', color: 'created' },
  AGENT_ASSIGNED:    { label: 'Agent Assigned',       icon: '', color: 'agent_assigned' },
  PICKED_UP:         { label: 'Picked Up',            icon: '', color: 'picked_up' },
  IN_TRANSIT:        { label: 'In Transit',           icon: '', color: 'in_transit' },
  OUT_FOR_DELIVERY:  { label: 'Out for Delivery',     icon: '', color: 'out_for_delivery' },
  DELIVERED:         { label: 'Delivered',            icon: '', color: 'delivered' },
  FAILED:            { label: 'Delivery Failed',      icon: '', color: 'failed' },
  RESCHEDULED:       { label: 'Rescheduled',          icon: '', color: 'rescheduled' },
  CANCELLED:         { label: 'Cancelled',            icon: '', color: 'cancelled' },
};

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, icon: '', color: 'created' };
  return (
    <span className={`badge badge-${meta.color.toLowerCase()}`}>
      {meta.icon ? `${meta.icon} ` : ''}{meta.label}
    </span>
  );
}

export function formatCurrency(amount) {
  return `₹${Number(amount || 0).toFixed(2)}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function formatDateOnly(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

export function shortId(id) {
  return id ? `#${id.slice(-8).toUpperCase()}` : '';
}

export function getErrorMsg(err) {
  return err?.response?.data?.error ||
         err?.response?.data?.errors?.[0]?.msg ||
         err?.message ||
         'Something went wrong';
}
