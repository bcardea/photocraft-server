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

app.post('/debug', (req, res) => {
  console.log('Debug route hit');
  res.json({ status: 'ok', headers: req.headers, body: req.body });
});

app.post('/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    console.log('Generating image with prompt:', prompt);

    const output = await replicate.run(
      'black-forest-labs/flux-1.1-pro-ultra',
      {
        input: {
          prompt: prompt,
          raw: false,
          aspect_ratio: '1:1',
          output_format: 'png',
          safety_tolerance: 2,
          image_prompt_strength: 0.1
        }
      }
    );

    console.log('Replicate output:', output);

    if (!output) {
      throw new Error('No output received from Replicate');
    }

    const imageUrl = output; 
    console.log('Generated image URL:', imageUrl);

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch generated image');
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    console.log('Fetched image buffer, size:', imageBuffer.length);

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

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});