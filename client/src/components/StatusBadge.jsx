// Reusable status badge for task status: pending / in_progress / completed
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    className: 'bg-orange-100 text-orange-700',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-blue-100 text-blue-700',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700',
  },
};

export function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG['pending'];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${config.className}`}
    >
      {config.label}
    </span>
  );
}
