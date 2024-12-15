import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { addFilmGrain } from './services/image-processor.js';
import fetch from 'node-fetch';
import Replicate from 'replicate'; // Correctly import Replicate as a function

dotenv.config();

const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Ensure the Replicate API token exists
if (!process.env.REPLICATE_API_TOKEN) {
  console.error('No Replicate API token found in environment variables!');
  process.exit(1);
}

console.log('Initializing Replicate...');
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

// Debug route
app.post('/debug', (req, res) => {
  console.log('Debug route hit');
  res.json({ status: 'ok', headers: req.headers, body: req.body });
});

// Generate image route
app.post('/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    console.log('Generating image with prompt:', prompt);

    // Generate image with Replicate
    const output = await replicate.run('black-forest-labs/flux-1.1-pro-ultra', {
      input: {
        prompt: prompt,
        raw: false,
        aspect_ratio: '1:1',
        output_format: 'png',
        safety_tolerance: 2,
        image_prompt_strength: 0.1
      }
    });

    if (!output || !output[0]) {
      throw new Error('No output received from Replicate');
    }

    const imageUrl = output[0];
    console.log('Generated image URL:', imageUrl);

    // Fetch the generated image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch generated image');
    }

    const imageBuffer = await imageResponse.buffer();
    console.log('Fetched image buffer, size:', imageBuffer.length);

    // Apply film grain overlay
    const processedImageBuffer = await addFilmGrain(imageBuffer);
    console.log('Film grain applied successfully');

    const base64Image = processedImageBuffer.toString('base64');
    res.json({
      success: true,
      imageData: `data:image/png;base64,${base64Image}`
    });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({
      error: 'Failed to generate image',
      details: error.message
    });
  }
});

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});