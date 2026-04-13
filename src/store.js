import { create } from 'zustand'

export const useStore = create((set) => ({
  // Catalog data
  stars: null,
  starsLoading: true,
  starsError: null,
  starCount: 0,

  // Selected object
  selectedObject: null,
  setSelectedObject: (obj) => set({ selectedObject: obj }),

  // Filters
  filters: {
    stars: true,
    galaxies: true,
    nebulae: true,
    clusters: true,
    exoplanets: true,
    blackHoles: true,
  },
  toggleFilter: (type) =>
    set((state) => ({
      filters: { ...state.filters, [type]: !state.filters[type] },
    })),

  // View mode
  viewMode: 'observed', // 'observed' | 'estimated_present'
  setViewMode: (mode) => set({ viewMode: mode }),

  // Scale mode
  scaleMode: 'log', // 'linear' | 'log'
  setScaleMode: (mode) => set({ scaleMode: mode }),

  // Speed (as exponent: 10^speedLevel = multiplier of c)
  speedLevel: 0, // 0 = 1c, 1 = 10c, 3 = 1000c, 6 = 1Mc, 9 = 1Gc
  setSpeedLevel: (level) => set({ speedLevel: Math.max(0, Math.min(9, level)) }),

  // Camera target for fly-to
  cameraTarget: null,
  setCameraTarget: (target) => set({ cameraTarget: target }),

  // Catalog actions
  setStars: (stars) =>
    set({ stars, starsLoading: false, starCount: stars ? stars.length : 0 }),
  setStarsError: (error) => set({ starsError: error, starsLoading: false }),
}))
