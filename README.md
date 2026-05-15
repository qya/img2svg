# Image2SVG

A modern, browser-based image to SVG converter with machine learning-powered tracing technology. Convert your images to scalable vector graphics directly in your browser using WebAssembly for fast, local processing.

## Features

- 🚀 **Fast Processing**: Uses WebAssembly for high-performance, local processing
- 🎨 **Multiple Trace Modes**:
  - Pixel-perfect tracing
  - Polygon approximation
  - Spline curves
- 🎭 **Color Options**: Full color or black & white conversion
- 🔄 **Advanced Settings**:
  - Filter speckle
  - Color precision
  - Gradient step
  - Corner threshold
  - Segment length
- 📱 **Responsive Design**: Works perfectly on desktop and mobile devices
- 🌓 **Dark/Light Mode**: Auto-detects system settings with manual override
- 🚫 **No Upload Required**: Images are processed locally in your browser
- 📥 **Auto Download**: Optional automatic download after conversion
- 🤖 **Machine Learning**: Advanced tracing algorithm using machine learning techniques

## Usage

1. **Upload an Image**: Drag and drop an image file or click to browse
2. **Choose Settings**: Select your preferred trace mode and options
3. **Convert**: Click the "Convert" button to process your image
4. **Download or Copy**: Save your SVG file or copy the SVG code directly

## Installation

You can run Image2SVG locally using the following steps:

```bash
# Clone the repository
git clone https://github.com/qya/img2svg.git
cd img2svg

# Install dependencies
npm install

# Start the development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Chrome Extension

We also offer a Chrome extension that allows you to convert images to SVG directly from your browser. Right-click any image on the web and convert it instantly.

## Technology Stack

- **React 19**: Modern UI library
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful SVG icons
- **WebAssembly**: High-performance image processing
- **VTracer**: Advanced image tracing algorithm using machine learning

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Contact

If you have any questions, issues, or suggestions, please create an issue on GitHub or contact us through our repository.

---
## License

MIT - see [LICENSE](LICENSE).