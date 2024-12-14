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

// Image generation endpoint
app.post('/generate-image', async (req, res) => {
  console.log('=== Image Generation Request ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));
  
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      console.error('No prompt provided');
      return res.status(400).json({ 
        error: 'Prompt is required',
        details: 'The prompt field is missing from the request body'
      });
    }

    console.log('Using Replicate API token:', config.replicate.apiToken ? 'Present' : 'Missing');
    console.log('Generating image with prompt:', prompt);
    
    let output;
    try {
      output = await replicate.run(
        "black-forest-labs/flux-1.1-pro-ultra",
        { 
          input: {
            prompt,
            aspect_ratio: "3:2"
          }
        }
      );
    } catch (replicateError) {
      console.error('Replicate API error:', replicateError);
      return res.status(500).json({
        error: 'Failed to generate image with Replicate API',
        details: replicateError.message,
        stack: replicateError.stack
      });
    }

    console.log('Replicate output:', output);

    let imageUrl;
    if (typeof output === 'string') {
      imageUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      imageUrl = output[0];
    } else {
      console.error('Invalid output format from Replicate:', output);
      return res.status(500).json({
        error: 'Invalid output from Replicate API',
        details: 'Expected string or array of strings',
        output: output
      });
    }

    // Add film grain
    console.log('Adding film grain effect to image URL:', imageUrl);
    let processedImage;
    try {
      processedImage = await addFilmGrain(imageUrl);
    } catch (grainError) {
      console.error('Error adding film grain:', grainError);
      return res.status(500).json({
        error: 'Failed to add film grain effect',
        details: grainError.message,
        stack: grainError.stack
      });
    }
    
    // Convert to base64 for sending back to client
    const base64Image = processedImage.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    console.log('Successfully processed image, sending response');
    return res.json({ imageUrl: dataUrl });
  } catch (error) {
    console.error('Error in /generate-image:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Failed to generate image',
      details: error.message,
      stack: error.stack
    });
  }
});

// Catch-all route for debugging
app.use((req, res, next) => {
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

const PORT = 3005;
const HOST = 'localhost';

console.log('Starting server...');
app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log('Registered routes:');
  app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
      console.log(`- ${Object.keys(r.route.methods).join(', ').toUpperCase()}\t${r.route.path}`);
    }
  });
});
