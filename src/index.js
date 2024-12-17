import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { addFilmGrain } from './services/image-processor.js';
import Replicate from 'replicate';

dotenv.config();
const replicate = new Replicate();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    console.log(`[${new Date().toISOString()}] Received prompt: ${prompt}`);

    // Start timing the Replicate call
    console.log(`[${new Date().toISOString()}] Starting replicate.run()`);
    const replicateStart = Date.now();

    const output = await replicate.run('black-forest-labs/flux-1.1-pro-ultra', {
      input: {
        prompt: prompt,
        raw: false,
        aspect_ratio: '3:2',
        output_format: 'png',
        safety_tolerance: 2,
        image_prompt_strength: 0.1
      }
    });

    const replicateEnd = Date.now();
    console.log(`[${new Date().toISOString()}] replicate.run() completed in ${((replicateEnd - replicateStart) / 1000).toFixed(2)}s`);

    if (!output) {
      throw new Error('No output received from Replicate');
    }

    const imageUrl = output; 
    console.log(`[${new Date().toISOString()}] Received image URL: ${imageUrl}`);

    // Start timing the image fetch
    console.log(`[${new Date().toISOString()}] Starting image fetch`);
    const fetchStart = Date.now();

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch generated image');
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    const fetchEnd = Date.now();
    console.log(`[${new Date().toISOString()}] Image fetched in ${((fetchEnd - fetchStart) / 1000).toFixed(2)}s, size: ${imageBuffer.length} bytes`);

    // Start timing the image processing
    console.log(`[${new Date().toISOString()}] Starting filmgrain overlay`);
    const processStart = Date.now();

    const processedImageBuffer = await addFilmGrain(imageBuffer);

    const processEnd = Date.now();
    console.log(`[${new Date().toISOString()}] Filmgrain applied in ${((processEnd - processStart) / 1000).toFixed(2)}s`);

    const base64Image = processedImageBuffer.toString('base64');
    console.log(`[${new Date().toISOString()}] Sending response`);
    res.json({
      success: true,
      imageData: `data:image/png;base64,${base64Image}`
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error generating image:`, error);
    res.status(500).json({
      error: 'Failed to generate image',
      details: error.message
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
});