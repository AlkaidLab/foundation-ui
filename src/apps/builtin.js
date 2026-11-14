// The built-in apps of the host (Desktop, Steam Big Picture …) and the pure restore of them: one source for the Web UI (the apps page and the guide) and the panel (the guide), so
// 「还原内置应用」 gives the same list wherever it is pressed. No network and no UI here: callers read and save the list themselves (GET and POST /api/apps).

// 默认菜单命令的显示名称翻译键（按命令 id）。恢复默认应用时按当前界面语言填写名称，
// 因为客户端（Moonlight）会原样显示这里保存的名称。
export const DEFAULT_MENU_CMD_NAME_KEYS = {
  kcENAT5r9P: 'apps.default_menu_cmd_touch_keyboard',
  rjeOKHmcdL: 'apps.default_menu_cmd_desktop_pet',
};

// 默认内置应用配置
export const DEFAULT_BUILT_IN_APPS = {
  windows: [
    {
      name: 'Desktop',
      'image-path': 'desktop',
      'exclude-global-prep-cmd': 'false',
      elevated: '',
      'auto-detach': 'true',
      'wait-all': 'true',
      'exit-timeout': '5',
      'menu-cmd': [
        {
          id: 'kcENAT5r9P',
          name: 'Touch Keyboard',
          cmd: '.\\tools\\qiin-tabtip.exe',
          elevated: 'false'
        },
        {
          id: 'rjeOKHmcdL',
          name: 'Desktop Pet',
          cmd: '.\\assets\\gui\\sunshine-gui.exe --toolbar',
          elevated: 'false'
        }
      ]
    },
    {
      name: 'Steam Big Picture',
      cmd: 'steam://open/bigpicture',
      'auto-detach': 'true',
      'wait-all': 'true',
      'image-path': 'steam.png'
    },
    {
      name: 'Xbox Game',
      cmd: 'cmd /c "start xbox:"',
      'auto-detach': 'true',
      'wait-all': 'true',
      'image-path': 'box.png'
    }
  ],
  linux: [
    {
      name: 'Desktop',
      'image-path': 'desktop.png'
    },
    {
      name: 'Low Res Desktop',
      'image-path': 'desktop.png',
      'prep-cmd': [
        {
          do: 'xrandr --output HDMI-1 --mode 1920x1080',
          undo: 'xrandr --output HDMI-1 --mode 1920x1200'
        }
      ]
    },
    {
      name: 'Steam Big Picture',
      detached: [
        'setsid steam steam://open/bigpicture'
      ],
      'image-path': 'steam.png'
    }
  ],
  macos: [
    {
      name: 'Desktop',
      'image-path': 'desktop.png'
    },
    {
      name: 'Steam Big Picture',
      detached: [
        'open steam://open/bigpicture'
      ],
      'image-path': 'steam.png'
    }
  ]
};

const cloneData = (value) => JSON.parse(JSON.stringify(value))
const normalizeAppName = (name) => String(name || '').trim().toLowerCase()
const withoutIndex = (app) => {
  const { index, ...rest } = app || {}
  return rest
}

/**
 * The platform default built-in apps.
 * @param {string} platform windows | linux | macos
 * @param {Function} [translate] i18n t(); when given, default menu command names follow the UI language (the English names stay when a key has no translation)
 */
export function getDefaultBuiltInApps(platform, translate) {
  const apps = cloneData(DEFAULT_BUILT_IN_APPS[platform] || [])
  if (typeof translate !== 'function') return apps
  apps.forEach((app) => {
    (app['menu-cmd'] || []).forEach((menuCmd) => {
      const key = DEFAULT_MENU_CMD_NAME_KEYS[menuCmd.id]
      const translated = key ? translate(key) : ''
      if (translated && translated !== key) menuCmd.name = translated
    })
  })
  return apps
}

/** Restores the matching built-in app defaults and appends the missing ones: { apps, added, restored, changed }. Apps of the person's own are kept as they are. */
export function restoreDefaultBuiltInApps(apps, platform, translate) {
  const defaults = getDefaultBuiltInApps(platform, translate)
  const nextApps = cloneData(Array.isArray(apps) ? apps : [])
  let added = 0
  let restored = 0
  defaults.forEach((defaultApp) => {
    const defaultName = normalizeAppName(defaultApp.name)
    const existingIndex = nextApps.findIndex((app) => normalizeAppName(app.name) === defaultName)
    const cleanDefault = cloneData(defaultApp)
    if (existingIndex === -1) {
      nextApps.push(cleanDefault)
      added++
      return
    }
    if (JSON.stringify(withoutIndex(nextApps[existingIndex])) !== JSON.stringify(cleanDefault)) {
      nextApps[existingIndex] = cleanDefault
      restored++
    }
  })
  return { apps: nextApps, added, restored, changed: added + restored }
}
