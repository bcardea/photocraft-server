import express from 'express';
import cors from 'cors';
import Replicate from 'replicate';
import { config } from './config/config.js';
import { addFilmGrain } from './services/image-processor.js';
import fetch from 'node-fetch';
const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Replicate
if (!config.replicate.apiToken) {
  console.error('No Replicate API token found in config!');
  process.exit(1);
}

console.log('Initializing Replicate with API token:', config.replicate.apiToken.substring(0, 5) + '...');
const replicate = new Replicate({
  auth: config.replicate.apiToken
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
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt: prompt,
          negative_prompt: "low quality, blurry, distorted",
          width: 1024,
          height: 1024,
        }
      }
    );

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
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  console.error('Error stack:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    details: err.message,
    stack: err.stack
  });
});

const PORT = process.env.PORT || 3005;

console.log('Starting server...');
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Registered routes:');
  app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
      console.log(`- ${Object.keys(r.route.methods).join(', ').toUpperCase()}\t${r.route.path}`);
    }
  });
});