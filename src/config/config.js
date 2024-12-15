export const config = {
  supabase: {
    url: 'https://dibgxoeykwmdhwdodimw.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpYmd4b2V5a3dtZGh3ZG9kaW13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5NTcxNzksImV4cCI6MjA0OTUzMzE3OX0.yJ_u36iTtOW-S7-v60ciLHatP5AuQQm9Ji2SRHQ34hA'
  },
  gemini: {
    apiKey: 'AIzaSyBk5HVlon2qKrcvy8R2rvphnFJGERoHpmg'
  },
  replicate: {
    apiToken: process.env.REPLICATE_API_TOKEN
  }
};
