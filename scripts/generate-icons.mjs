import sharp from 'sharp';
import { existsSync } from 'fs';

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

const input = './public/logo.png';

if (!existsSync(input)) {
  console.error('logo.png not found in public/');
  process.exit(1);
}

for (const size of sizes) {
  const output = `./public/icon-${size}.png`;
  await sharp(input)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(output);
  console.log(`✓ ${output}`);
}

// favicon (32x32)
await sharp(input)
  .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile('./public/favicon.png');
console.log('✓ public/favicon.png');

console.log('\nDone! All icons generated from logo.png');
