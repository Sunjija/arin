import { App } from '@capacitor/app'
import { SplashScreen } from '@capacitor/splash-screen'
import { handleHardwareBack } from './backButton'
import { startKeyboardBridge } from './keyboard'
import { startExternalLinkInterceptor } from './links'
import { applyRuntimeDomFlags, isNativeRuntime } from './runtime'

async function onNativeBack(canGoBack: boolean): Promise<void> {
  const action = await handleHardwareBack(canGoBack)
  if (action === 'history') {
    window.history.back()
    return
  }
  if (action === 'exit') {
    await App.exitApp()
  }
}

export async function bootPlatform(): Promise<() => void> {
  applyRuntimeDomFlags()
  const stopLinks = startExternalLinkInterceptor()
  const stopKeyboard = await startKeyboardBridge()

  let stopBack: () => void = () => {}
  if (isNativeRuntime()) {
    const backHandle = await App.addListener('backButton', (event) => {
      void onNativeBack(event.canGoBack)
    })
    stopBack = () => {
      void backHandle.remove()
    }
    void SplashScreen.hide()
  }

  return () => {
    stopLinks()
    stopKeyboard()
    stopBack()
  }
}
