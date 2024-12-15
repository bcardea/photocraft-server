import express from 'express';
import cors from 'cors';
import Replicate from 'replicate';
import dotenv from 'dotenv';
import { addFilmGrain } from './src/services/image-processor.js';
import fetch from 'node-fetch';

// Load environment variables from .env file
dotenv.config();

const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Replicate
if (!process.env.REPLICATE_API_TOKEN) {
  console.error('No Replicate API token found in environment variables!');
  process.exit(1);
}

console.log('Initializing Replicate with API token:', process.env.REPLICATE_API_TOKEN.substring(0, 5) + '...');
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

// Debug route
app.post('/debug', (req, res) => {
  console.log('Debug route hit');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  res.json({ status: 'ok', headers: req.headers, body: req.body });
});

// Generate image route
app.post('/generate-image', async (req, res) => {
  try {
    const { prompt, style } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    console.log('Generating image with prompt:', prompt);
    console.log('Style:', style);

    // Generate the initial image using Replicate
    const input = {
      prompt: prompt,
      raw: false,
      aspect_ratio: "3:2", // Set the aspect ratio to 1:1, but you can change it
      output_format: "jpg", // Output can be 'png' or 'jpg'
      safety_tolerance: 2, // Set safety level (1 = strict, 6 = permissive)
      image_prompt_strength: 0.1 // This is required for image prompts
    };

    console.log('Sending input to Replicate API:', input);

    const output = await replicate.run("black-forest-labs/flux-1.1-pro-ultra", { input });

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

    let processedImageBuffer = imageBuffer;

    // Apply film grain if style is 'film'
    if (style === 'film') {
      console.log('Applying film grain effect...');
      processedImageBuffer = await addFilmGrain(imageBuffer);
      console.log('Film grain applied');
    }

    // Convert buffer to base64
    const base64Image = processedImageBuffer.toString('base64');
    console.log('Converted image to base64');

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
  console.log('404 - Route not found:', req.method, req.url);
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: err.message
  });
});

const PORT = process.env.PORT || 3005;

console.log('Starting server...');
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});