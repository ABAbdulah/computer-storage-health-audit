import type { Configuration } from 'electron-builder'

/**
 * electron-builder configuration for packaging SpaceScope into a Windows
 * installer (.exe via NSIS) plus a portable build.
 */
const config: Configuration = {
  appId: 'com.spacescope.app',
  productName: 'SpaceScope',
  copyright: `Copyright © ${new Date().getFullYear()} SpaceScope Contributors`,
  directories: {
    output: 'release/${version}',
    buildResources: 'build'
  },
  files: ['out/**/*', 'package.json', '!**/*.map'],
  asar: true,
  // The bundled scan worker must run as real Node code; unpack it from asar.
  asarUnpack: ['out/main/scanWorker.js'],
  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] }
    ],
    artifactName: '${productName}-${version}-${arch}.${ext}'
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'SpaceScope'
  },
  portable: {
    artifactName: '${productName}-${version}-portable.${ext}'
  }
}

export default config
