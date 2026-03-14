/* eslint-env jest */

import { parseInternalLinks, isMisleadingLink, getPrivacyRedirectUrl, isPrivacyRedirectable } from './url.js'

const internalLinkCases = [
  ['https://stacker.news/items/123', '#123'],
  ['https://stacker.news/items/123/related', '#123/related'],
  // invalid links should not be parsed so user can spot error
  ['https://stacker.news/items/123foobar', undefined],
  // Invalid origin should not be parsed so no malicious links
  ['https://example.com/items/123', undefined],
  // parse referral links
  ['https://stacker.news/items/123/r/ekzyis', '#123'],
  // use comment id if available
  ['https://stacker.news/items/123?commentId=456', '#456'],
  // comment id + referral link
  ['https://stacker.news/items/123/r/ekzyis?commentId=456', '#456'],
  // multiple params
  ['https://stacker.news/items/123?commentId=456&parentId=789', '#456']
]

describe('internal links', () => {
  test.each(internalLinkCases)(
    'parses %p as %p',
    (href, expected) => {
      process.env.NEXT_PUBLIC_URL = 'https://stacker.news'
      const { linkText: actual } = parseInternalLinks(href)
      expect(actual).toBe(expected)
    }
  )
})

const misleadingLinkCases = [
  // if text is the same as the link, it's not misleading
  ['https://stacker.news/items/1234', 'https://stacker.news/items/1234', false],
  // same origin is not misleading
  ['https://stacker.news/items/1235', 'https://stacker.news/items/1234', false],
  ['www.google.com', 'https://www.google.com', false],
  ['stacker.news', 'https://stacker.news', false],
  // if text is obviously not a link, it's not misleading
  ['innocent text', 'https://stacker.news/items/1234', false],
  ['innocenttext', 'https://stacker.news/items/1234', false],
  // if text might be a link to a different origin, it's misleading
  ['innocent.text', 'https://stacker.news/items/1234', true],
  ['https://google.com', 'https://bing.com', true],
  ['www.google.com', 'https://bing.com', true],
  ['s-tacker.news', 'https://snacker.news', true]
]

describe('misleading links', () => {
  test.each(misleadingLinkCases)(
    'identifies [%p](%p) as misleading: %p',
    (text, href, expected) => {
      const actual = isMisleadingLink(text, href)
      expect(actual).toBe(expected)
    }
  )
})

const privacyRedirectCases = [
  // Twitter/X redirects
  ['https://twitter.com/user/status/1234567890', { privacyRedirects: true }, 'https://xcancel.com/i/status/1234567890'],
  ['https://x.com/user/status/1234567890', { privacyRedirects: true }, 'https://xcancel.com/i/status/1234567890'],
  // Reddit redirects
  ['https://reddit.com/r/funny/comments/abc123/title', { privacyRedirects: true }, 'https://redlib.com/r/funny/comments/abc123'],
  // TikTok redirects
  ['https://tiktok.com/@username/video/1234567890123456789', { privacyRedirects: true }, 'https://proxitok.pabloferreiro.es/@username/video/1234567890123456789'],
  // Twitch redirects
  ['https://twitch.tv/username', { privacyRedirects: true }, 'https://safetwitch.uest.cc/username'],
  // Custom URL
  ['https://twitter.com/user/status/1234567890', { privacyRedirects: true, privacyUrlTwitter: 'https://custom.twittermirror.com' }, 'https://custom.twittermirror.com/i/status/1234567890'],
  // Privacy redirects disabled
  ['https://twitter.com/user/status/1234567890', { privacyRedirects: false }, null],
  // Unsupported domain
  ['https://google.com/search?q=test', { privacyRedirects: true }, null],
]

describe('privacy redirects', () => {
  test.each(privacyRedirectCases)(
    'redirects %p to %p when privacyRedirects is %p',
    (url, settings, expected) => {
      const actual = getPrivacyRedirectUrl(url, settings)
      expect(actual).toBe(expected)
    }
  )
})

const privacyRedirectableCases = [
  ['https://twitter.com/user/status/123', true],
  ['https://x.com/user/status/123', true],
  ['https://reddit.com/r/test/comments/abc', true],
  ['https://www.reddit.com/r/test/comments/abc', true],
  ['https://tiktok.com/@user/video/123', true],
  ['https://twitch.tv/user', true],
  ['https://google.com/search', false],
  ['https://github.com/user/repo', false],
]

describe('privacy redirectable check', () => {
  test.each(privacyRedirectableCases)(
    'identifies %p as redirectable: %p',
    (url, expected) => {
      const actual = isPrivacyRedirectable(url)
      expect(actual).toBe(expected)
    }
  )
})
