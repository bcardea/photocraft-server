import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

// Preload the filmgrain overlay from a local file.
// Make sure to have overlays/filmgrain.png in your project directory.
let filmGrainOverlay;
(async () => {
  filmGrainOverlay = await readFile('./overlays/filmgrain.png');
})();

export async function addFilmGrain(imageBuffer) {
  try {
    const processedImage = await sharp(imageBuffer)
      .composite([{ input: filmGrainOverlay, blend: 'overlay' }])
      .toBuffer();

    return processedImage;
  } catch (error) {
    console.error('Error applying film grain:', error);
    throw error;
  }
}