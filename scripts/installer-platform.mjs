export function installerPlatform(platform = process.platform, environment = process.env) {
  const windows = platform === 'win32';
  return Object.freeze({
    platform,
    caseInsensitivePaths: windows,
    directoryLinkType: windows ? 'junction' : 'dir',
    recordedLinkType: windows ? 'junction' : 'symbolic-link',
    directoryLinkRemovalFallback: windows ? 'rmdir' : 'none',
    dependencyCommand: Object.freeze(windows
      ? {
          command: environment.ComSpec || environment.COMSPEC || 'cmd.exe',
          args: Object.freeze(['/d', '/s', '/c', 'npm ci --ignore-scripts']),
        }
      : {
          command: 'npm',
          args: Object.freeze(['ci', '--ignore-scripts']),
        }),
  });
}

