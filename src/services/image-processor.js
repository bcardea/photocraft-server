import sharp from 'sharp';

export async function addFilmGrain(imageBuffer) {
  try {
    console.log('Applying film grain overlay...');
    const filmGrainOverlay = await sharp('./path-to-grain-overlay.png')
      .resize({ width: 2496, height: 1664 })
      .toBuffer();

    const processedImage = await sharp(imageBuffer)
      .composite([{ input: filmGrainOverlay, blend: 'overlay' }])
      .toBuffer();

    console.log('Film grain applied successfully');
    return processedImage;
  } catch (error) {
    console.error('Error applying film grain:', error);
    throw error;
  }
}