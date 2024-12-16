import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

// Preload the filmgrain overlay
let filmGrainOverlayBuffer;
(async () => {
  filmGrainOverlayBuffer = await readFile('./overlays/filmgrain.png');
})();

export async function addFilmGrain(imageBuffer) {
  try {
    // Get metadata of the generated image
    const { width, height } = await sharp(imageBuffer).metadata();

    if (!width || !height) {
      throw new Error('Could not determine image dimensions');
    }

    // Resize the overlay to match the generated image dimensions
    const resizedOverlay = await sharp(filmGrainOverlayBuffer)
      .resize(width, height, {
        fit: 'cover'
      })
      .toBuffer();

    const processedImage = await sharp(imageBuffer)
      .composite([{ input: resizedOverlay, blend: 'overlay' }])
      .toBuffer();

    return processedImage;
  } catch (error) {
    console.error('Error applying film grain:', error);
    throw error;
  }
}