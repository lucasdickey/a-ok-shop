#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const conceptDir = path.join(projectRoot, 'v0-retro-style-game-concept');
const tempDir = path.join(projectRoot, '.v0-retro-style-game-concept-temp');

// Check if we're running in Vercel build environment
const isVercelBuild = process.env.VERCEL === '1';

try {
  console.log('Starting build preparation...');
  
  // Only perform the directory moving if the directory exists
  if (fs.existsSync(conceptDir)) {
    console.log('v0-retro-style-game-concept directory found');
    
    if (isVercelBuild) {
      console.log('Running in Vercel environment, temporarily moving directory...');
      
      // Create parent directory if it doesn't exist
      if (!fs.existsSync(path.dirname(tempDir))) {
        fs.mkdirSync(path.dirname(tempDir), { recursive: true });
      }

      // Move the directory temporarily
      fs.renameSync(conceptDir, tempDir);
      console.log('Directory moved to temporary location');
    } else {
      console.log('Not running in Vercel environment, skipping directory move');
    }
  } else {
    console.log('v0-retro-style-game-concept directory not found, continuing...');
  }

  // Run the actual Next.js build command
  console.log('Running Next.js build...');
  execSync('next build', { stdio: 'inherit' });

  // Move the directory back if we moved it
  if (isVercelBuild && fs.existsSync(tempDir)) {
    console.log('Moving directory back to original location...');
    fs.renameSync(tempDir, conceptDir);
    console.log('Directory restored');
  }

  console.log('Build completed successfully');
} catch (error) {
  console.error('Build preparation failed:', error);
  
  // Attempt to restore the directory if something went wrong
  if (isVercelBuild && fs.existsSync(tempDir) && !fs.existsSync(conceptDir)) {
    console.log('Restoring directory after error...');
    try {
      fs.renameSync(tempDir, conceptDir);
      console.log('Directory restored');
    } catch (restoreError) {
      console.error('Failed to restore directory:', restoreError);
    }
  }
  
  process.exit(1);
}