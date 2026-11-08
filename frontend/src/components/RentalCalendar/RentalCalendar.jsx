import { useMemo, useState } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import './RentalCalendar.css';

export default function RentalCalendar({ periods = [], onSelectRange = null, selectedRange = null }) {
  const { isRtl } = useSettings();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthNamesAr = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const weekdaysEn = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const weekdaysAr = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  const monthTitle = isRtl ? `${monthNamesAr[month]} ${year}` : `${monthNamesEn[month]} ${year}`;
  const weekdays = isRtl ? weekdaysAr : weekdaysEn;

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Parse booked intervals
  const bookedIntervals = useMemo(() => {
    return (periods || []).map((p) => {
      const s = new Date(p.startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(p.endDate);
      e.setHours(0, 0, 0, 0);
      return { start: s, end: e };
    });
  }, [periods]);

  const days = [];
  // Empty slots before 1st of month
  for (let i = 0; i < firstDayIndex; i++) {
    days.push({ key: `empty-${i}`, empty: true });
  }

  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(year, month, d);
    cellDate.setHours(0, 0, 0, 0);
    const isPast = cellDate < today;

    // Check if cellDate falls in any booked period [start, end)
    const isBooked = bookedIntervals.some(
      (b) => cellDate >= b.start && cellDate < b.end
    );

    let isSelected = false;
    if (selectedRange?.startDate && selectedRange?.endDate) {
      const s = new Date(selectedRange.startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(selectedRange.endDate);
      e.setHours(0, 0, 0, 0);
      isSelected = cellDate >= s && cellDate <= e;
    }

    days.push({
      key: `day-${d}`,
      empty: false,
      dayNum: d,
      date: cellDate,
      isPast,
      isBooked,
      isSelected,
    });
  }

  return (
    <div className="rental-calendar-container">
      {/* Calendar Month Header */}
      <div className="calendar-header">
        <button
          type="button"
          className="calendar-nav-btn"
          onClick={prevMonth}
          aria-label={isRtl ? 'الشهر السابق' : 'Previous month'}
        >
          <i className={`bi ${isRtl ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
        </button>

        <h4 className="calendar-month-title">{monthTitle}</h4>

        <button
          type="button"
          className="calendar-nav-btn"
          onClick={nextMonth}
          aria-label={isRtl ? 'الشهر التالي' : 'Next month'}
        >
          <i className={`bi ${isRtl ? 'bi-chevron-left' : 'bi-chevron-right'}`}></i>
        </button>
      </div>

      {/* Weekday Names */}
      <div className="calendar-weekdays-grid">
        {weekdays.map((w, idx) => (
          <div key={idx}>{w}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="calendar-days-grid">
        {days.map((item) => {
          if (item.empty) {
            return <div key={item.key} className="calendar-day-cell empty" />;
          }

          let stateClass = 'available';
          if (item.isPast) stateClass = 'past';
          else if (item.isBooked) stateClass = 'booked';
          if (item.isSelected) stateClass += ' selected';

          return (
            <div
              key={item.key}
              className={`calendar-day-cell ${stateClass}`}
              title={
                item.isPast
                  ? (isRtl ? 'تاريخ سابق' : 'Past date')
                  : item.isBooked
                  ? (isRtl ? 'محجوز' : 'Booked')
                  : (isRtl ? 'متاح للحجز' : 'Available')
              }
            >
              <span>{item.dayNum}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot available"></span>
          <span>{isRtl ? 'متاح' : 'Available'}</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot booked"></span>
          <span>{isRtl ? 'محجوز' : 'Booked'}</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot past"></span>
          <span>{isRtl ? 'سابق' : 'Past'}</span>
        </div>
      </div>
    </div>
  );
}

