#!/usr/bin/env node
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const icon = join(root, 'resources', 'icon.png')
const splash = join(root, 'resources', 'splash.png')
const androidRes = join(root, 'android/app/src/main/res')
const iosAssets = join(root, 'ios/App/App/Assets.xcassets')

const mipmapDirs = ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi']
const splashDirs = [
  'drawable',
  'drawable-port-mdpi',
  'drawable-port-hdpi',
  'drawable-port-xhdpi',
  'drawable-port-xxhdpi',
  'drawable-port-xxxhdpi',
  'drawable-land-mdpi',
  'drawable-land-hdpi',
  'drawable-land-xhdpi',
  'drawable-land-xxhdpi',
  'drawable-land-xxxhdpi',
]

async function copyIconSet() {
  for (const dir of mipmapDirs) {
    const dest = join(androidRes, dir)
    await mkdir(dest, { recursive: true })
    await copyFile(icon, join(dest, 'ic_launcher.png'))
    await copyFile(icon, join(dest, 'ic_launcher_round.png'))
    await copyFile(icon, join(dest, 'ic_launcher_foreground.png'))
  }
  for (const dir of splashDirs) {
    const dest = join(androidRes, dir)
    await mkdir(dest, { recursive: true })
    await copyFile(splash, join(dest, 'splash.png'))
  }
}

async function copyIos() {
  await copyFile(icon, join(iosAssets, 'AppIcon.appiconset/AppIcon-512@2x.png'))
  await copyFile(splash, join(iosAssets, 'Splash.imageset/splash-2732x2732.png'))
  await copyFile(splash, join(iosAssets, 'Splash.imageset/splash-2732x2732-1.png'))
  await copyFile(splash, join(iosAssets, 'Splash.imageset/splash-2732x2732-2.png'))
}

await copyIconSet()
await copyIos()
console.log('Copied development icon and splash into android/ and ios/')
