import sharp from 'sharp';
import fetch from 'node-fetch';

export async function addFilmGrain(imageBuffer) {
  try {
    console.log('Fetching film grain overlay from remote URL...');
    const overlayUrl = 'https://storage.googleapis.com/msgsndr/jI35EgXT0cs2YnriH7gl/media/675ae904d80b03076db4c6bd.png';

    // Fetch the film grain overlay image from the URL
    const response = await fetch(overlayUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch overlay image: ${response.statusText}`);
    }
    const filmGrainOverlay = await response.buffer();

    console.log('Applying film grain overlay...');
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