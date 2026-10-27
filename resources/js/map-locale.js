/**
 * MapLibre's own control labels ("Map", "Zoom in", "Zoom out"…) in the interface language.
 * Pass as `locale` to every `new maplibregl.Map`; a missing key falls back to MapLibre's English.
 */
import { t } from './i18n.js'

export function mapLocale () {
  return {
    'Map.Title': t('Map'),
    'Marker.Title': t('Map marker'),
    'NavigationControl.ResetBearing': t('Drag to rotate map, click to reset north'),
    'NavigationControl.ZoomIn': t('Zoom in'),
    'NavigationControl.ZoomOut': t('Zoom out'),
    'Popup.Close': t('Close'),
    'GlobeControl.Enable': t('Enable globe'),
    'GlobeControl.Disable': t('Disable globe'),
  }
}
