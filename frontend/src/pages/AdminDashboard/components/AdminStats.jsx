import './AdminStats.css';

// Metric cards that jump to the matching management tab.
export default function AdminStats({ stats, onJump }) {
  if (!stats) return null;
  const cards = [
    { label: 'Properties', value: stats.totalProperties, tab: 'properties' },
    { label: 'Live listings', value: stats.publishedProperties, tab: 'properties' },
    { label: 'Pending review', value: stats.pendingProperties, tab: 'approvals', alert: stats.pendingProperties > 0 },
    { label: 'Sold / rented', value: stats.soldProperties, tab: 'properties' },
    { label: 'Users', value: stats.totalUsers, tab: 'users' },
    { label: 'Purchase requests', value: stats.purchaseRequests, sub: `${stats.pendingPurchaseRequests} pending`, tab: 'purchases' },
    { label: 'Rental requests', value: stats.bookingRequests, sub: `${stats.pendingBookingRequests} pending`, tab: 'rentals' },
    { label: 'Property views', value: stats.propertyViews, tab: null },
    { label: 'Inquiries', value: stats.inquiries, sub: `${stats.unreadInquiries} unread`, tab: 'inquiries' },
  ];

  return (
    <div className="admin-stats">
      {cards.map((c) => (
        <button
          key={c.label} type="button"
          className={`stat-card ${c.alert ? 'alert' : ''} ${c.tab ? '' : 'static'}`}
          onClick={c.tab ? () => onJump(c.tab) : undefined}
          disabled={!c.tab}
        >
          <strong>{c.value}</strong>
          <span>{c.label}</span>
          {c.sub && <em>{c.sub}</em>}
        </button>
      ))}
    </div>
  );
}
