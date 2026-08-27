export interface GalleryLocale {
  readonly title: string
  readonly searchLabel: string
  readonly searchPlaceholder: string
  readonly schemeLabel: string
  readonly allSchemes: string
  readonly lightScheme: string
  readonly darkScheme: string
  readonly categoryLabel: string
  readonly allCategories: string
  readonly selected: string
  readonly persistenceError: string
  readonly retrySaving: string
  readonly empty: string
  readonly externalProvider: string
  readonly builtInLight: string
  readonly builtInDark: string
  readonly builtInSystem: string
}

export const en: GalleryLocale = Object.freeze({
  title: 'Design MD themes',
  searchLabel: 'Search themes',
  searchPlaceholder: 'Search by name, category, or description',
  schemeLabel: 'Color scheme',
  allSchemes: 'All schemes',
  lightScheme: 'Light',
  darkScheme: 'Dark',
  categoryLabel: 'Category',
  allCategories: 'All categories',
  selected: 'Selected',
  persistenceError: 'Could not save theme preference.',
  retrySaving: 'Retry saving',
  empty: 'No themes match these filters.',
  externalProvider: 'Another plugin currently manages the active theme.',
  builtInLight: 'Light',
  builtInDark: 'Dark',
  builtInSystem: 'System',
})

export const zh: GalleryLocale = Object.freeze({
  title: 'Design MD 主题',
  searchLabel: '搜索主题',
  searchPlaceholder: '按名称、分类或描述搜索',
  schemeLabel: '颜色方案',
  allSchemes: '全部方案',
  lightScheme: '浅色',
  darkScheme: '深色',
  categoryLabel: '分类',
  allCategories: '全部分类',
  selected: '已选择',
  persistenceError: '主题偏好保存失败。',
  retrySaving: '重试保存',
  empty: '没有符合筛选条件的主题。',
  externalProvider: '当前主题由另一个插件管理。',
  builtInLight: '浅色',
  builtInDark: '深色',
  builtInSystem: '跟随系统',
})
