using System.Net;

namespace Infrastructure.BackgroundJobs;

internal static class EmailTemplates
{
    private static string Encode(string? text) => WebUtility.HtmlEncode(text ?? string.Empty);

    private static string WrapLayout(string heading, string bodyHtml) => $@"
<!DOCTYPE html>
<html dir=""rtl"" lang=""ar"">
<head><meta charset=""utf-8""></head>
<body style=""font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f7f7f5; padding: 24px; color: #1c1c1a;"">
  <div style=""max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e2dc; overflow: hidden;"">
    <div style=""background: #0e2a33; color: #ffffff; padding: 24px; text-align: center;"">
      <h1 style=""margin: 0; font-size: 22px; color: #c9a86a;"">DARCOM | داركم</h1>
      <p style=""margin: 6px 0 0; font-size: 13px; color: #e2e2dc;"">North Coast Luxury Real Estate</p>
    </div>
    <div style=""padding: 28px 24px;"">
      <h2 style=""margin: 0 0 14px; font-size: 18px; color: #0e2a33;"">{Encode(heading)}</h2>
      {bodyHtml}
      <hr style=""border: none; border-top: 1px solid #e9e9e2; margin: 24px 0 14px;"" />
      <p style=""margin: 0; font-size: 12px; color: #7a7a72; text-align: center;"">
        هذا البريد مُرسل تلقائيًا من منصة داركم العقارية — الساحل الشمالي، مصر.
      </p>
    </div>
  </div>
</body>
</html>";

    public static string BuildOtpHtml(string code, int expiryMinutes) => WrapLayout(
        "رمز التحقق لتسجيل الدخول",
        $@"<div style=""text-align: center;"">
          <p style=""margin: 0 0 20px; font-size: 14px; color: #5c5c56;"">استخدم الرمز التالي لإتمام تسجيل الدخول إلى حسابك في داركم:</p>
          <div style=""display: inline-block; background: #f7f7f5; border: 2px dashed #c9a86a; border-radius: 10px; padding: 14px 28px; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #0e2a33; direction: ltr;"">
            {Encode(code)}
          </div>
          <p style=""margin: 20px 0 0; font-size: 13px; color: #5c5c56;"">
            صالح لمدة <strong>{expiryMinutes} دقائق</strong> فقط ولا تشاركه مع أي شخص.
          </p>
        </div>");

    public static string BuildWelcomeHtml(string fullName) => WrapLayout(
        $"مرحباً بك في داركم يا {fullName}",
        $@"<p style=""font-size: 15px; line-height: 1.7; color: #3d3d38;"">
          يسعدنا انضمامك إلى منصة <strong>داركم</strong> المتخصصة في عقارات الساحل الشمالي.
        </p>
        <p style=""font-size: 14px; line-height: 1.7; color: #5c5c56;"">
          يمكنك الآن استعراض العقارات المتاحة للبيع أو الإيجار، حفظ المفضلة، وحجز المعاينات ومتابعة طلباتك من لوحة حسابك مباشرة.
        </p>");

    public static string BuildBookingCreatedHtml(string fullName, string requestNumber, string propertyTitle, DateTime? start, DateTime? end) => WrapLayout(
        "تم استلام طلب الحجز بنجاح",
        $@"<p style=""font-size: 15px; color: #3d3d38;"">مرحباً {Encode(fullName)}،</p>
        <p style=""font-size: 14px; line-height: 1.7; color: #5c5c56;"">
          تم تسجيل طلب حجز الإيجار رقم <strong>{Encode(requestNumber)}</strong> للوحدة <strong>{Encode(propertyTitle)}</strong>.
        </p>
        {(start.HasValue && end.HasValue ? $"<p style=\"font-size: 14px; color: #0e2a33;\">الفترة المطلوبة: <strong>{start:yyyy-MM-dd}</strong> إلى <strong>{end:yyyy-MM-dd}</strong></p>" : string.Empty)}
        <p style=""font-size: 14px; color: #5c5c56;"">سيقوم فريقنا بمراجعة التوافر والتواصل معك قريبًا.</p>");

    public static string BuildBookingStatusHtml(string fullName, string requestNumber, string propertyTitle, string status) => WrapLayout(
        $"تحديث حالة الحجز ({requestNumber})",
        $@"<p style=""font-size: 15px; color: #3d3d38;"">مرحباً {Encode(fullName)}،</p>
        <p style=""font-size: 14px; line-height: 1.7; color: #5c5c56;"">
          تم تحديث حالة طلب الحجز رقم <strong>{Encode(requestNumber)}</strong> الخاص بعقار <strong>{Encode(propertyTitle)}</strong> إلى:
          <strong style=""color: #0e2a33;"">{Encode(status)}</strong>.
        </p>");

    public static string BuildListingRequestStatusHtml(string fullName, string requestNumber, string villageName, string status, DateTime? inspectionDate) => WrapLayout(
        $"تحديث طلب عرض العقار ({requestNumber})",
        $@"<p style=""font-size: 15px; color: #3d3d38;"">مرحباً {Encode(fullName)}،</p>
        <p style=""font-size: 14px; line-height: 1.7; color: #5c5c56;"">
          تم تحديث حالة طلبك رقم <strong>{Encode(requestNumber)}</strong> في قرية <strong>{Encode(villageName)}</strong> إلى:
          <strong style=""color: #0e2a33;"">{Encode(status)}</strong>.
        </p>
        {(inspectionDate.HasValue ? $"<p style=\"font-size: 14px; color: #0e2a33;\">موعد المعاينة المحدد: <strong>{inspectionDate:yyyy-MM-dd HH:mm}</strong></p>" : string.Empty)}");

    public static string BuildBrokerStatusHtml(string fullName, string status, string? notes) => WrapLayout(
        "تحديث حالة تسجيل الوسيط",
        $@"<p style=""font-size: 15px; color: #3d3d38;"">مرحباً {Encode(fullName)}،</p>
        <p style=""font-size: 14px; line-height: 1.7; color: #5c5c56;"">
          تم تحديث حالة حساب الوسيط العقاري الخاص بك إلى: <strong style=""color: #0e2a33;"">{Encode(status)}</strong>.
        </p>
        {(!string.IsNullOrWhiteSpace(notes) ? $"<p style=\"font-size: 13px; color: #5c5c56;\">ملاحظات الإدارة: {Encode(notes)}</p>" : string.Empty)}");

    public static string BuildRequirementConfirmationHtml(string fullName, int requirementId, string purpose) => WrapLayout(
        "تم تسجيل طلب مواصفات العقار",
        $@"<p style=""font-size: 15px; color: #3d3d38;"">مرحباً {Encode(fullName)}،</p>
        <p style=""font-size: 14px; line-height: 1.7; color: #5c5c56;"">
          تم استلام طلبك (#{requirementId}) للبحث عن وحدة مناسبة ({Encode(purpose)}). سيتواصل معك مستشارونا عند توفر العروض المطابقة.
        </p>");

    public static string BuildReminderHtml(string fullName, string headline, string details) => WrapLayout(
        headline,
        $@"<p style=""font-size: 15px; color: #3d3d38;"">مرحباً {Encode(fullName)}،</p>
        <p style=""font-size: 14px; line-height: 1.7; color: #5c5c56;"">{Encode(details)}</p>");

    public static string BuildDailyReportHtml(
        DateTime reportDateLocal,
        int newSaleProperties,
        int newRentProperties,
        int bookingRequests,
        int confirmedBookings,
        int viewingRequests,
        int inquiries,
        int brokerRegistrations) => WrapLayout(
        $"التقرير اليومي لمنصة داركم ({reportDateLocal:yyyy-MM-dd})",
        $@"<p style=""font-size: 14px; color: #5c5c56;"">ملخص نشاط الساحل الشمالي خلال الـ 24 ساعة الماضية:</p>
        <table style=""width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 12px;"">
          <tr><td style=""padding: 8px; border-bottom: 1px solid #eee;"">عقارات بيع جديدة</td><td style=""padding: 8px; border-bottom: 1px solid #eee; font-weight: 700;"">{newSaleProperties}</td></tr>
          <tr><td style=""padding: 8px; border-bottom: 1px solid #eee;"">عقارات إيجار جديدة</td><td style=""padding: 8px; border-bottom: 1px solid #eee; font-weight: 700;"">{newRentProperties}</td></tr>
          <tr><td style=""padding: 8px; border-bottom: 1px solid #eee;"">طلبات حجز الإيجار</td><td style=""padding: 8px; border-bottom: 1px solid #eee; font-weight: 700;"">{bookingRequests}</td></tr>
          <tr><td style=""padding: 8px; border-bottom: 1px solid #eee;"">الحجوزات المؤكدة</td><td style=""padding: 8px; border-bottom: 1px solid #eee; font-weight: 700;"">{confirmedBookings}</td></tr>
          <tr><td style=""padding: 8px; border-bottom: 1px solid #eee;"">طلبات المعاينة وعرض العقار</td><td style=""padding: 8px; border-bottom: 1px solid #eee; font-weight: 700;"">{viewingRequests}</td></tr>
          <tr><td style=""padding: 8px; border-bottom: 1px solid #eee;"">الاستفسارات الجديدة</td><td style=""padding: 8px; border-bottom: 1px solid #eee; font-weight: 700;"">{inquiries}</td></tr>
          <tr><td style=""padding: 8px;"">طلبات تسجيل الوسطاء</td><td style=""padding: 8px; font-weight: 700;"">{brokerRegistrations}</td></tr>
        </table>");
}

