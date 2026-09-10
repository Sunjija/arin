import { Keyboard } from '@capacitor/keyboard'
import { isNativeRuntime } from './runtime'

const KEYBOARD_VAR = '--keyboard-height'

function setKeyboardHeight(px: number): void {
  document.documentElement.style.setProperty(KEYBOARD_VAR, `${Math.max(0, px)}px`)
  document.body.classList.toggle('keyboard-open', px > 0)
}

function scrollFocusedField(): void {
  const el = document.activeElement
  if (!(el instanceof HTMLElement)) return
  if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.tagName !== 'SELECT') return
  el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
}

export async function startKeyboardBridge(): Promise<() => void> {
  if (typeof document !== 'undefined') setKeyboardHeight(0)
  if (!isNativeRuntime()) {
    return () => setKeyboardHeight(0)
  }

  const show = await Keyboard.addListener('keyboardWillShow', (info) => {
    setKeyboardHeight(info.keyboardHeight)
  })
  const shown = await Keyboard.addListener('keyboardDidShow', (info) => {
    setKeyboardHeight(info.keyboardHeight)
    scrollFocusedField()
  })
  const hide = await Keyboard.addListener('keyboardWillHide', () => {
    setKeyboardHeight(0)
  })
  const hidden = await Keyboard.addListener('keyboardDidHide', () => {
    setKeyboardHeight(0)
  })

  return () => {
    void show.remove()
    void shown.remove()
    void hide.remove()
    void hidden.remove()
    setKeyboardHeight(0)
  }
}
