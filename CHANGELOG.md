# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-11-19

### Added
- 2D map mode with disabled rotation and tilt for better UX
- Zoom controls (ToolBar) in top-right corner
- Scale bar in bottom-right corner

### Changed
- **Major code optimization**: Reduced JavaScript from 879 lines to 475 lines (45.9% reduction)
- **CSS optimization**: Reduced control styles from 74 lines to 51 lines (31% reduction)
- Improved dark mode styling for all map controls (zoom buttons and scale)
- Standardized terminology: Changed "聚合" (aggregate) to "集群" (cluster) throughout codebase

### Removed
- All `console.log` debugging statements
- Unused rendering functions (`_renderMarker`, `_renderClusterMarker`)
- Redundant helper functions and duplicate code

### Fixed
- Dark mode: Zoom buttons now display white color on dark backgrounds
- Dark mode: Scale bar separator opacity reduced to 0.08 for better visibility
- Dark mode: Scale background changed to transparent (removed white frame)

## [1.1.0] - 2025-11-18

### Added
- Smart marker clustering with grid-based algorithm (80px grid size)
- Cluster toggle control to enable/disable clustering on demand
- Category-based filtering system
- Automatic category extraction from location data

### Changed
- Optimized marker overlap handling with clustering algorithm
- Improved performance for large datasets (100+ locations)

### Fixed
- Marker z-index conflicts when zooming in/out
- Category filter not updating map immediately

## [1.0.0] - 2025-11-15

### Added
- Initial release of xiaoten-footprintmap
- Interactive footprint map based on AMap Web JS API 2.0
- Hugo shortcode integration
- Photo carousel with lightbox viewer
- Light/dark theme auto-adaptation
- Mobile responsive design
- 6 preset marker color gradients
- Custom marker color support
- Location popup with title, description, date, link, and photos
- JSON data format support
- Pure static implementation (no backend required)

[1.2.0]: https://github.com/Jiosanity/xiaoten-footprintmap/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Jiosanity/xiaoten-footprintmap/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Jiosanity/xiaoten-footprintmap/releases/tag/v1.0.0
