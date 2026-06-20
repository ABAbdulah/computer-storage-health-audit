// electron-builder configuration (CommonJS).
//
// NOTE: This is intentionally .cjs, not .ts. electron-builder's TypeScript
// config loader (config-file-ts) builds a cache directory whose name contains
// the project path — on Windows that path includes a drive-letter colon (e.g.
// "C:"), which is an illegal folder-name character, so loading a .ts config
// fails with EINVAL. A .cjs config is require()'d directly and avoids that.

/** @type {import('electron-builder').Configuration} */
const config = {
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
    // Stable installer name (no version) so a "latest release" direct-download
    // URL keeps working across version bumps:
    //   /releases/latest/download/SpaceScope-Setup-x64.exe
    artifactName: '${productName}-Setup-${arch}.${ext}'
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
  },
  // Publish target for `electron-builder --publish always` (used by CI on a tag).
  publish: {
    provider: 'github',
    owner: 'ABAbdulah',
    repo: 'computer-storage-health-audit'
  }
}

module.exports = config
