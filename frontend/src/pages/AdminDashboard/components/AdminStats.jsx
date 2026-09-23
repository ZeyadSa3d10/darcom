import { useSettings } from '../../../context/SettingsContext.jsx';
import './AdminStats.css';

// Metric cards that jump to the matching management tab.
export default function AdminStats({ stats, onJump }) {
  const { t, isRtl } = useSettings();
  if (!stats) return null;

  const pendingText = t('admin.stats.pending', isRtl ? 'معلق' : 'pending');
  const unreadText = t('admin.stats.unread', isRtl ? 'غير مقروء' : 'unread');

  const cards = [
    {
      id: 'properties',
      label: t('admin.stats.properties', isRtl ? 'إجمالي العقارات' : 'Properties'),
      value: stats.totalProperties,
      tab: 'properties',
      icon: 'bi-buildings',
    },
    {
      id: 'live',
      label: t('admin.stats.liveListings', isRtl ? 'عقارات معروضة' : 'Live listings'),
      value: stats.publishedProperties,
      tab: 'properties',
      icon: 'bi-patch-check-fill',
    },
    {
      id: 'pending',
      label: t('admin.stats.pendingReview', isRtl ? 'بانتظار الموافقة' : 'Pending review'),
      value: stats.pendingProperties,
      tab: 'approvals',
      alert: stats.pendingProperties > 0,
      icon: 'bi-clock-history',
    },
    {
      id: 'sold',
      label: t('admin.stats.soldRented', isRtl ? 'تم البيع / التأجير' : 'Sold / rented'),
      value: stats.soldProperties,
      tab: 'properties',
      icon: 'bi-check2-all',
    },
    {
      id: 'users',
      label: t('admin.stats.users', isRtl ? 'المستخدمون' : 'Users'),
      value: stats.totalUsers,
      tab: 'users',
      icon: 'bi-people-fill',
    },
    {
      id: 'purchases',
      label: t('admin.stats.purchaseRequests', isRtl ? 'طلبات الشراء' : 'Purchase requests'),
      value: stats.purchaseRequests,
      sub: `${stats.pendingPurchaseRequests} ${pendingText}`,
      tab: 'purchases',
      icon: 'bi-bag-check-fill',
    },
    {
      id: 'rentals',
      label: t('admin.stats.rentalRequests', isRtl ? 'طلبات الإيجار' : 'Rental requests'),
      value: stats.bookingRequests,
      sub: `${stats.pendingBookingRequests} ${pendingText}`,
      tab: 'rentals',
      icon: 'bi-key-fill',
    },
    {
      id: 'views',
      label: t('admin.stats.propertyViews', isRtl ? 'مشاهدات العقارات' : 'Property views'),
      value: stats.propertyViews,
      tab: null,
      icon: 'bi-eye-fill',
    },
    {
      id: 'inquiries',
      label: t('admin.stats.inquiries', isRtl ? 'الاستفسارات' : 'Inquiries'),
      value: stats.inquiries,
      sub: `${stats.unreadInquiries} ${unreadText}`,
      tab: 'inquiries',
      icon: 'bi-chat-left-dots-fill',
    },
  ];

  return (
    <div className="admin-stats">
      {cards.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`stat-card ${c.alert ? 'alert' : ''} ${c.tab ? '' : 'static'}`}
          onClick={c.tab ? () => onJump(c.tab) : undefined}
          disabled={!c.tab}
        >
          <div className="stat-card-top">
            <span className="stat-card-icon">
              <i className={`bi ${c.icon}`}></i>
            </span>
            {c.alert && <span className="stat-pulse-dot" title="Action required"></span>}
          </div>
          <strong>{Number(c.value).toLocaleString('en-US')}</strong>
          <span className="stat-card-title">{c.label}</span>
          {c.sub && <em>{c.sub}</em>}
        </button>
      ))}
    </div>
  );
}
