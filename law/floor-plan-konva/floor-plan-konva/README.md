# Floor Plan Manager - TypeScript + Konva.js

A professional floor plan management application built with TypeScript and Konva.js canvas library.

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18 or higher) - Download from [nodejs.org](https://nodejs.org/)
2. **VS Code** - Download from [code.visualstudio.com](https://code.visualstudio.com/)

### VS Code Extensions (Recommended)

Install these extensions in VS Code for the best experience:

1. **ESLint** - `dbaeumer.vscode-eslint`
2. **Prettier** - `esbenp.prettier-vscode`
3. **TypeScript Vue Plugin (Volar)** - `Vue.vscode-typescript-vue-plugin` (optional)
4. **Path Intellisense** - `christian-kohler.path-intellisense`

To install extensions:
- Open VS Code
- Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac)
- Search for each extension and click "Install"

### Setup Instructions

1. **Open the project folder in VS Code**
   ```bash
   cd floor-plan-konva
   code .
   ```

2. **Open the integrated terminal**
   - Press `` Ctrl+` `` (backtick) or go to `View > Terminal`

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Add your floor plan image**
   - Copy your `floor1.jpg` to the project root folder
   - (Optional) Copy your `plate_data.json` to the project root

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   - The app will automatically open at `http://localhost:3000`
   - Or click the link in the terminal

## 📁 Project Structure

```
floor-plan-konva/
├── index.html          # HTML entry point
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── vite.config.ts      # Vite build configuration
├── floor1.jpg          # Your floor plan image (add this)
├── plate_data.json     # Your data file (add this)
└── src/
    ├── main.ts         # Application entry point
    ├── canvas.ts       # Konva.js canvas manager
    ├── store.ts        # State management
    ├── ui.ts           # UI helper functions
    ├── types.ts        # TypeScript type definitions
    └── styles.css      # Application styles
```

## 🎮 Controls

| Action | Control |
|--------|---------|
| Draw mode | `D` key or click ✏️ Draw |
| Pan mode | `P` key or click ✋ Pan |
| Place circle | Click on map (Draw mode) |
| Delete circle | Right-click on circle |
| Remove selected | `Delete` or `Backspace` |
| Zoom in | `+` key or scroll up |
| Zoom out | `-` key or scroll down |
| Fit to view | `F` key or click Fit |
| Cancel selection | `Escape` |

## 📊 Data Format

### plate_data.json

```json
[
  {
    "plate": "Location A",
    "signals": {
      "Router1": -45,
      "Router2": -67,
      "Router3": -82
    }
  },
  {
    "plate": "Location B",
    "signals": {
      "Router1": -52,
      "Router2": -61,
      "Router3": -78
    }
  }
]
```

### Exported Data Format

When you click "Save", the exported JSON includes coordinates:

```json
[
  {
    "row": 1,
    "x": 450,
    "y": 320,
    "size": 24,
    "plate": "Location A",
    "signals": {
      "Router1": -45,
      "Router2": -67
    }
  }
]
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## 🏗️ Building for Production

```bash
npm run build
```

The built files will be in the `dist/` folder. You can deploy this folder to any static hosting service.

## 💡 Tips

1. **Auto-save**: Points are automatically saved to localStorage
2. **Image persistence**: The loaded image is cached in localStorage
3. **Hover tooltips**: Hover over any circle to see its data
4. **Sidebar navigation**: Click items in the sidebar to select points

## 🐛 Troubleshooting

### "Cannot find module" errors
```bash
rm -rf node_modules
npm install
```

### Port 3000 already in use
Edit `vite.config.ts` and change the port:
```typescript
server: {
  port: 3001,  // Change to a different port
}
```

### TypeScript errors in VS Code
- Press `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

### Image not loading
- Make sure `floor1.jpg` is in the project root (same folder as `index.html`)
- Check browser console for errors

## 📝 License

MIT License - Feel free to use and modify!
