import { textTable } from '../locale/texts/index.js'
// Texts of the mode-list editors (the resolutions and refresh rates the host offers to clients; the same two lists are written to the 基地虚拟显示器 / Foundation Virtual Display driver).
// `picker` is the checklist editor (MModePicker); the rest is the popup editor (MModeListDialog) and the summary chips. Chinese and English; any other interface language reads the English ones.
const EN = {
  resolutionTitle: 'Resolutions of Foundation Virtual Display', rateTitle: 'Refresh rates of Foundation Virtual Display', dialogTitle: 'Supported resolutions and refresh rates', edit: 'Edit', save: 'Save', cancel: 'Cancel', none: 'None set',
  count: '{n} set',
  resolution: { add: 'Add resolution', placeholder: 'e.g. 1920x1080', section: 'Resolutions', hint: 'At most 25; written to the driver in list order', editItem: 'Edit resolution', ok: 'OK', cancelEdit: 'Cancel', up: 'Move up', down: 'Move down', remove: 'Remove', sort: 'Sort by size', errors: { invalid: 'Use “width x height”, for example 1920x1080', range: 'Width and height must each be between {min} and {max}', exists: 'This resolution is already in the list', minOne: 'Keep at least one resolution', full: 'The list holds at most {count} entries' } },
  rate: { add: 'Add refresh rate', placeholder: 'e.g. 120 or 59.94', section: 'Refresh rates', hint: 'At most 5; applies to every resolution', editItem: 'Edit refresh rate', ok: 'OK', cancelEdit: 'Cancel', up: 'Move up', down: 'Move down', remove: 'Remove', sort: 'Sort by size', errors: { invalid: 'Enter a number with up to three decimals, for example 60 or 59.94', range: 'The refresh rate must be between {min} and {max} Hz', exists: 'This refresh rate is already in the list', minOne: 'Keep at least one refresh rate', full: 'The list holds at most {count} entries' } },
  noteShort: 'The driver applies the new lists after it reloads.',
  note: 'The driver applies the new lists after it reloads: a Foundation Virtual Display that is already running has to be created again (reconnect the stream) before it shows them. If nothing changes, use “Reload Driver” in the Foundation Virtual Display driver tools, or restart the adapter or Windows.',
  picker: {
    resolution: { name: 'Supported resolutions', limit: 'At most {max} resolutions', groups: { '16:9': '16:9', '16:10': '16:10', '21:9': '21:9', '32:9': '32:9', custom: 'Custom' }, custom: 'Custom size', width: 'Width', height: 'Height' },
    rate: { name: 'Supported refresh rates', limit: 'At most {max} refresh rates', groups: { common: 'Common', custom: 'Custom' }, custom: 'Custom rate', value: 'Refresh rate', placeholder: 'e.g. 59.94' },
    add: 'Add', offered: 'Offered to clients', sort: 'Sort by size', earlier: 'Move earlier', later: 'Move later', remove: 'Remove',
  },
}
const ZH = {
  resolutionTitle: '基地虚拟显示器支持的分辨率', rateTitle: '基地虚拟显示器支持的刷新率', dialogTitle: '支持的分辨率与刷新率', edit: '编辑', save: '保存', cancel: '取消', none: '未设置',
  count: '{n} 项',
  resolution: { add: '添加分辨率', placeholder: '如 1920x1080', section: '分辨率', hint: '最多 25 项，按列表顺序写入驱动', editItem: '修改分辨率', ok: '确定', cancelEdit: '取消', up: '上移', down: '下移', remove: '移除', sort: '按大小排序', errors: { invalid: '格式应为“宽x高”，例如 1920x1080', range: '宽和高均须在 {min} 至 {max} 之间', exists: '列表中已有该分辨率', minOne: '至少保留一个分辨率', full: '列表最多 {count} 项' } },
  rate: { add: '添加刷新率', placeholder: '如 120 或 59.94', section: '刷新率', hint: '最多 5 项，对所有分辨率生效', editItem: '修改刷新率', ok: '确定', cancelEdit: '取消', up: '上移', down: '下移', remove: '移除', sort: '按大小排序', errors: { invalid: '请输入数值，最多三位小数，例如 60 或 59.94', range: '刷新率须在 {min} 至 {max} Hz 之间', exists: '列表中已有该刷新率', minOne: '至少保留一个刷新率', full: '列表最多 {count} 项' } },
  noteShort: '驱动重新加载后应用新列表。',
  note: '驱动重新加载后应用新列表：正在运行的基地虚拟显示器需重新创建（重新连接串流）后才会生效。若无变化，请在基地虚拟显示器的驱动工具中选择“重新加载驱动”，或重启适配器或 Windows。',
  picker: {
    resolution: { name: '支持的分辨率', limit: '最多 {max} 项', groups: { '16:9': '16:9', '16:10': '16:10', '21:9': '21:9', '32:9': '32:9', custom: '自定义' }, custom: '自定义尺寸', width: '宽', height: '高' },
    rate: { name: '支持的刷新率', limit: '最多 {max} 项', groups: { common: '常用', custom: '自定义' }, custom: '自定义刷新率', value: '刷新率', placeholder: '如 59.94' },
    add: '添加', offered: '客户端可选', sort: '按大小排序', earlier: '前移', later: '后移', remove: '移除',
  },
}
export const modeListTexts = (locale) => textTable('modeList', locale, EN, ZH)
export const MODE_LIST_TEXTS = Object.freeze({ en: EN, zh: ZH })
