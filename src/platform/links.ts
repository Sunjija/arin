import { Browser } from '@capacitor/browser'
import { isNativeRuntime } from './runtime'

function isHttpUrl(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://')
}

export function isExternalHref(href: string, origin = typeof location === 'undefined' ? '' : location.origin): boolean {
  if (!href || href.startsWith('#') || href.startsWith('?')) return false
  if (href.startsWith('mailto:') || href.startsWith('tel:')) return true
  if (href.startsWith('/') && !href.startsWith('//')) return false
  if (href.startsWith('arin://')) return false
  try {
    const url = new URL(href, origin || 'https://localhost')
    if (url.protocol === 'capacitor:' || url.hostname === 'localhost') return false
    if (!origin) return isHttpUrl(url.href)
    return url.origin !== origin
  } catch {
    return false
  }
}

export async function openExternalUrl(href: string): Promise<void> {
  if (isNativeRuntime()) {
    await Browser.open({ url: href, toolbarColor: '#F7F6F2' })
    return
  }
  window.open(href, '_blank', 'noopener,noreferrer')
}

export function startExternalLinkInterceptor(): () => void {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
    const target = event.target
    if (!(target instanceof Element)) return
    const anchor = target.closest('a')
    if (!anchor || !anchor.href) return
    if (anchor.href.startsWith('mailto:') || anchor.href.startsWith('tel:')) return
    if (anchor.target !== '_blank' && !isExternalHref(anchor.href)) return
    if (!isHttpUrl(anchor.href)) return
    event.preventDefault()
    void openExternalUrl(anchor.href)
  }
  document.addEventListener('click', onClick, true)
  return () => document.removeEventListener('click', onClick, true)
}
