namespace Application.Common;

public static class PhoneNormalizer
{
    private static readonly char[] ArabicDigits = { '٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩' };
    private static readonly char[] PersianDigits = { '۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹' };

    /// <summary>
    /// Converts Arabic-Indic (٠-٩) and Persian (۰-۹) numerals to standard ASCII digits (0-9).
    /// </summary>
    public static string NormalizeDigits(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        var chars = input.ToCharArray();
        for (int i = 0; i < chars.Length; i++)
        {
            var c = chars[i];
            var aIdx = Array.IndexOf(ArabicDigits, c);
            if (aIdx >= 0)
            {
                chars[i] = (char)('0' + aIdx);
                continue;
            }
            var pIdx = Array.IndexOf(PersianDigits, c);
            if (pIdx >= 0)
            {
                chars[i] = (char)('0' + pIdx);
            }
        }
        return new string(chars);
    }

    /// <summary>
    /// Normalizes a phone number by converting all digits to standard ASCII,
    /// removing spaces, dashes, and punctuation, and standardizing Egyptian mobile numbers.
    /// E.g. "+20 10 1234 5678" or "٠١٠١٢٣٤٥٦٧٨" -> "01012345678"
    /// </summary>
    public static string Normalize(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
        var s = NormalizeDigits(phone).Trim();
        var digitsOnly = new string(s.Where(char.IsDigit).ToArray());

        if (digitsOnly.StartsWith("20") && digitsOnly.Length == 12 && digitsOnly.StartsWith("201"))
        {
            return "0" + digitsOnly[2..];
        }

        if (digitsOnly.StartsWith("0020") && digitsOnly.Length == 14)
        {
            return "0" + digitsOnly[4..];
        }

        return digitsOnly;
    }
}

