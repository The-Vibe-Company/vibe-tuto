const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

const srcDir = path.join(__dirname, '..', 'src');
const distDir = path.join(__dirname, '..', 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Entry points
const entryPoints = [
  { in: 'src/popup/popup.ts', out: 'popup/popup' },
  { in: 'src/content/content.ts', out: 'content/content' },
  { in: 'src/background/service-worker.ts', out: 'background/service-worker' },
  { in: 'src/offscreen/offscreen.ts', out: 'offscreen/offscreen' },
];

// Build configuration
const buildOptions = {
  entryPoints: entryPoints.map(e => ({
    in: path.join(__dirname, '..', e.in),
    out: e.out,
  })),
  bundle: true,
  outdir: distDir,
  format: 'esm',
  target: 'chrome100',
  sourcemap: isWatch ? 'inline' : false,
  minify: !isWatch,
  logLevel: 'info',
};

// Copy static files
function copyStaticFiles() {
  // Copy manifest.json
  fs.copyFileSync(
    path.join(__dirname, '..', 'manifest.json'),
    path.join(distDir, 'manifest.json')
  );

  // Copy popup files
  const popupDir = path.join(distDir, 'popup');
  if (!fs.existsSync(popupDir)) {
    fs.mkdirSync(popupDir, { recursive: true });
  }
  fs.copyFileSync(
    path.join(srcDir, 'popup', 'popup.html'),
    path.join(popupDir, 'popup.html')
  );
  fs.copyFileSync(
    path.join(srcDir, 'popup', 'popup.css'),
    path.join(popupDir, 'popup.css')
  );

  // Copy offscreen files
  const offscreenDir = path.join(distDir, 'offscreen');
  if (!fs.existsSync(offscreenDir)) {
    fs.mkdirSync(offscreenDir, { recursive: true });
  }
  fs.copyFileSync(
    path.join(srcDir, 'offscreen', 'offscreen.html'),
    path.join(offscreenDir, 'offscreen.html')
  );

  // Copy icons
  const iconsSrcDir = path.join(__dirname, '..', 'icons');
  const iconsDistDir = path.join(distDir, 'icons');
  if (!fs.existsSync(iconsDistDir)) {
    fs.mkdirSync(iconsDistDir, { recursive: true });
  }
  if (fs.existsSync(iconsSrcDir)) {
    const icons = fs.readdirSync(iconsSrcDir);
    icons.forEach(icon => {
      fs.copyFileSync(
        path.join(iconsSrcDir, icon),
        path.join(iconsDistDir, icon)
      );
    });
  }

  console.log('Static files copied');
}

async function build() {
  try {
    if (isWatch) {
      const context = await esbuild.context(buildOptions);
      await context.watch();
      console.log('Watching for changes...');
      copyStaticFiles();
    } else {
      await esbuild.build(buildOptions);
      copyStaticFiles();
      console.log('Build complete!');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
