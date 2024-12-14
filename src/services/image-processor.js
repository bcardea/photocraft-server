import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
import fetch from 'node-fetch';

async function downloadImage(url) {
  try {
    // Handle data URLs
    if (url.startsWith('data:image')) {
      const base64Data = url.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    }

    // Handle regular URLs
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const buffer = await response.buffer();
    return buffer;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

export async function addFilmGrain(imageUrl) {
  try {
    // URLs
    const grainOverlayUrl = 'https://storage.googleapis.com/msgsndr/jI35EgXT0cs2YnriH7gl/media/675ae904d80b03076db4c6bd.png';

    // Fetch main image
    const mainResponse = await fetch(imageUrl);
    if (!mainResponse.ok) {
      throw new Error(`Failed to fetch main image: ${mainResponse.statusText}`);
    }
    const mainBuffer = Buffer.from(await mainResponse.arrayBuffer());

    // Fetch grain overlay image
    const grainResponse = await fetch(grainOverlayUrl);
    if (!grainResponse.ok) {
      throw new Error(`Failed to fetch grain overlay: ${grainResponse.statusText}`);
    }
    const grainBuffer = Buffer.from(await grainResponse.arrayBuffer());

    // Process with Sharp
    const mainImage = sharp(mainBuffer);
    const { width, height } = await mainImage.metadata();

    // Resize grain overlay to match main image
    const resizedGrain = await sharp(grainBuffer)
      .resize(width, height)
      .toBuffer();

    // Composite the images
    const processedImage = await mainImage
      .composite([
        {
          input: resizedGrain,
          blend: 'soft-light',
          opacity: 0.5
        }
      ])
      .jpeg()
      .toBuffer();

    return processedImage;
  } catch (error) {
    console.error('Error in addFilmGrain:', error);
    throw error;
  }
}

export async function overlayLogo(imageUrl, logoUrl, settings) {
  try {
    // Download both images
    const [mainBuffer, logoBuffer] = await Promise.all([
      downloadImage(imageUrl),
      downloadImage(logoUrl)
    ]);

    // Process with Sharp
    const mainImage = sharp(mainBuffer);
    const logoImage = sharp(logoBuffer);

    // Get metadata
    const { width: mainWidth, height: mainHeight } = await mainImage.metadata();
    const { width: logoWidth, height: logoHeight } = await logoImage.metadata();

    // Calculate logo size (as percentage of main image width)
    const targetLogoWidth = Math.round(mainWidth * (settings.size || 0.2));
    const scale = targetLogoWidth / logoWidth;
    const targetLogoHeight = Math.round(logoHeight * scale);

    // Resize logo
    const resizedLogo = await logoImage
      .resize(targetLogoWidth, targetLogoHeight)
      .toBuffer();

    // Calculate position
    let x = 0;
    let y = 0;

    switch (settings.position) {
      case 'top-left':
        x = settings.padding || 20;
        y = settings.padding || 20;
        break;
      case 'top-right':
        x = mainWidth - targetLogoWidth - (settings.padding || 20);
        y = settings.padding || 20;
        break;
      case 'bottom-left':
        x = settings.padding || 20;
        y = mainHeight - targetLogoHeight - (settings.padding || 20);
        break;
      case 'bottom-right':
        x = mainWidth - targetLogoWidth - (settings.padding || 20);
        y = mainHeight - targetLogoHeight - (settings.padding || 20);
        break;
      case 'center':
        x = (mainWidth - targetLogoWidth) / 2;
        y = (mainHeight - targetLogoHeight) / 2;
        break;
    }

    // Composite images
    const processedImage = await mainImage
      .composite([
        {
          input: resizedLogo,
          top: y,
          left: x,
          blend: 'over',
          opacity: settings.opacity || 0.8
        }
      ])
      .jpeg({ quality: 90 })
      .toBuffer();

    return processedImage;
  } catch (error) {
    console.error('Error overlaying logo:', error);
    throw error;
  }
}
