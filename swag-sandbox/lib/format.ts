export const fmtMoney = (n: number, digits = 0) =>
  '$' +
  n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })

export const fmtMoneyCompact = (n: number) => {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (abs >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'k'
  return '$' + Math.round(n).toLocaleString('en-US')
}

export const fmtNumber = (n: number) =>
  Math.round(n).toLocaleString('en-US')

export const fmtPct = (n: number, digits = 0) =>
  (n * 100).toFixed(digits) + '%'

export const fmtMultiple = (n: number) => n.toFixed(2) + 'x'
