import {
  base32Decode,
  base32Encode,
  generateTotpSecret,
  generateTotp,
  verifyTotp,
  generateOtpauthUrl,
  generateRecoveryCodes,
  hashRecoveryCode
} from '../totp.js'

describe('TOTP Library', () => {
  it('should encode and decode base32 correctly', () => {
    const input = Buffer.from('hello world stacker news 2fa')
    const encoded = base32Encode(input)
    const decoded = base32Decode(encoded)
    expect(decoded.toString()).toBe('hello world stacker news 2fa')
  })

  it('should generate a 32-character base32 TOTP secret', () => {
    const secret = generateTotpSecret()
    expect(secret).toHaveLength(32)
    expect(secret).toMatch(/^[A-Z2-7]+$/)
  })

  it('should generate valid 6-digit TOTP codes', () => {
    const secret = generateTotpSecret()
    const code = generateTotp(secret)
    expect(code).toMatch(/^\d{6}$/)
    expect(verifyTotp({ secret, token: code })).toBe(true)
  })

  it('should verify codes within tolerance window and reject wrong codes', () => {
    const secret = generateTotpSecret()
    const now = Date.now()

    const codeNow = generateTotp(secret, { time: now })
    expect(verifyTotp({ secret, token: codeNow, time: now })).toBe(true)

    const code30sAgo = generateTotp(secret, { time: now - 30000 })
    expect(verifyTotp({ secret, token: code30sAgo, time: now, window: 1 })).toBe(true)

    const code90sAgo = generateTotp(secret, { time: now - 90000 })
    expect(verifyTotp({ secret, token: code90sAgo, time: now, window: 1 })).toBe(false)

    expect(verifyTotp({ secret, token: '000000', time: now })).toBe(false)
  })

  it('should format otpauth URLs correctly', () => {
    const secret = 'JBSWY3DPEHPK3PXP'
    const url = generateOtpauthUrl({ secret, accountName: 'satsallday', issuer: 'stacker.news' })
    expect(url).toBe('otpauth://totp/stacker.news%3Asatsallday?secret=JBSWY3DPEHPK3PXP&issuer=stacker.news&algorithm=SHA1&digits=6&period=30')
  })

  it('should generate and hash recovery codes', () => {
    const codes = generateRecoveryCodes(8)
    expect(codes).toHaveLength(8)
    codes.forEach(code => {
      expect(code).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/)
    })

    const hash1 = hashRecoveryCode(codes[0])
    const hash2 = hashRecoveryCode(codes[0].toLowerCase())
    expect(hash1).toBe(hash2)
  })
})
