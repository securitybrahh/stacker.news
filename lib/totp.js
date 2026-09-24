import crypto from 'node:crypto'

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Decode (str) {
  const cleaned = String(str).toUpperCase().replace(/=+$/, '').replace(/\s+/g, '')
  let bits = 0
  let value = 0
  const output = []

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_CHARS.indexOf(cleaned[i])
    if (idx === -1) {
      throw new Error(`Invalid Base32 character: ${cleaned[i]}`)
    }
    value = (value << 5) | idx
    bits += 5

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }

  return Buffer.from(output)
}

export function base32Encode (buffer) {
  let bits = 0
  let value = 0
  let output = ''

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i]
    bits += 8

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31]
  }

  return output
}

export function generateTotpSecret (bytes = 20) {
  const buffer = crypto.randomBytes(bytes)
  return base32Encode(buffer)
}

export function generateTotp (secretBase32, { time = Date.now(), period = 30, digits = 6 } = {}) {
  const key = base32Decode(secretBase32)
  const counter = Math.floor(time / 1000 / period)

  const buf = Buffer.alloc(8)
  buf.writeBigInt64BE(BigInt(counter), 0)

  const hmac = crypto.createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f

  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  const code = (codeInt % (10 ** digits)).toString().padStart(digits, '0')
  return code
}

export function verifyTotp ({ secret, token, window = 1, time = Date.now(), period = 30, digits = 6 }) {
  if (!secret || !token) return false
  const cleanToken = String(token).trim().replace(/\s+/g, '')
  if (!/^\d{6}$/.test(cleanToken)) return false

  for (let i = -window; i <= window; i++) {
    const checkTime = time + i * period * 1000
    const expected = generateTotp(secret, { time: checkTime, period, digits })
    if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(expected))) {
      return true
    }
  }
  return false
}

export function generateOtpauthUrl ({ secret, accountName, issuer = 'stacker.news' }) {
  const label = accountName ? `${issuer}:${accountName}` : issuer
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}

export function generateRecoveryCodes (count = 8) {
  const codes = []
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase()
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`)
  }
  return codes
}

export function hashRecoveryCode (code) {
  const clean = String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return crypto.createHash('sha256').update(clean).digest('hex')
}
