import { defineConfig } from '@vite-pwa/assets-generator/config'

const background = '#FBF7EE'

// The source SVG is full-bleed with all artwork inside the maskable safe zone,
// so no extra padding is needed for any of the outputs.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    transparent: {
      sizes: [192, 512],
      favicons: [[48, 'favicon.ico']],
      padding: 0,
    },
    maskable: {
      sizes: [512],
      padding: 0,
      resizeOptions: { background },
    },
    apple: {
      sizes: [180],
      padding: 0,
      resizeOptions: { background },
    },
    assetName: (type, size) => {
      switch (type) {
        case 'transparent':
          return `pwa-${size.width}x${size.height}.png`
        case 'maskable':
          return `maskable-${size.width}x${size.height}.png`
        case 'apple':
          return `apple-touch-icon-${size.width}x${size.height}.png`
      }
    },
  },
  images: ['public/icons/icon.svg'],
})
