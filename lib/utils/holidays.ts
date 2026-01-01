export function checkIsHoliday(date: Date): boolean {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  // Hardcoded Korean holidays for 2025-2026
  const holidays: Record<number, string[]> = {
    2025: [
      "01-01", // New Year
      "03-01", // Independence Movement Day
      "05-01", // Labor Day
      "05-05", // Children's Day
      "06-06", // Memorial Day
      "08-15", // Liberation Day
      "10-03", // National Foundation Day
      "10-09", // Hangeul Day
      "12-25", // Christmas
      // 2025 Lunar holidays (approximate)
      "01-29", // Lunar New Year
      "01-30",
      "01-31",
      "10-06", // Chuseok
      "10-07",
      "10-08",
    ],
    2026: [
      "01-01", // New Year
      "03-01", // Independence Movement Day
      "05-01", // Labor Day
      "05-05", // Children's Day
      "06-06", // Memorial Day
      "08-15", // Liberation Day
      "10-03", // National Foundation Day
      "10-09", // Hangeul Day
      "12-25", // Christmas
      // 2026 Lunar holidays (approximate)
      "02-17", // Lunar New Year
      "02-18",
      "02-19",
      "09-25", // Chuseok
      "09-26",
      "09-27",
    ],
  }

  const dateString = `${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
  return holidays[year]?.includes(dateString) || false
}
