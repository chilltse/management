// 轻量验证：仅做 base64 存储，不适合生产环境
export function hashPassword(password: string): string {
  return btoa(encodeURIComponent(password))
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function validatePassword(password: string): { ok: boolean; msg?: string } {
  if (password.length < 6) return { ok: false, msg: '密码至少 6 位' }
  return { ok: true }
}
