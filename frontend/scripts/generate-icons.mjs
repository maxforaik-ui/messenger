import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../public');

// 🎨 Настройки иконки
const CONFIG = {
  bgColor: '#3390ec',       // Акцентный цвет из themeTokens
  symbol: 'M',              // Символ по центру. Можно заменить на '✈️', '💬', '🚀'
  cornerRadius: 80,         // Скругление углов (как у современных PWA)
  fontSize: 280,            // Размер символа
  fontColor: '#ffffff'
};

const svgContent = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <rect width="512" height="512" fill="${CONFIG.bgColor}" rx="${CONFIG.cornerRadius}"/>
    <text 
      x="256" y="360" 
      font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" 
      font-size="${CONFIG.fontSize}" 
      font-weight="800" 
      fill="${CONFIG.fontColor}" 
      text-anchor="middle"
    >${CONFIG.symbol}</text>
  </svg>
`;

async function generate() {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  const svgBuffer = Buffer.from(svgContent);

  console.log('⏳ Генерация иконок...');
  
  await sharp(svgBuffer)
    .resize(512, 512, { fit: 'contain' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUBLIC_DIR, 'icon-512.png'));

  await sharp(svgBuffer)
    .resize(192, 192, { fit: 'contain' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUBLIC_DIR, 'icon-192.png'));

  console.log('✅ Готово! Файлы сохранены в:');
  console.log(`   📁 ${path.join(PUBLIC_DIR, 'icon-512.png')}`);
  console.log(`   📁 ${path.join(PUBLIC_DIR, 'icon-192.png')}`);
}

generate().catch(err => {
  console.error('❌ Ошибка генерации:', err);
  process.exit(1);
});