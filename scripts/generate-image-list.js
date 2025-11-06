const fs = require("fs");
const path = require("path");

// Get the absolute path to the public directory
const publicDir = path.join(process.cwd(), "public");
const imageDir = path.join(publicDir, "images", "hp-art-grid-collection");
const outputFile = path.join(process.cwd(), "app", "data", "image-list.json");

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), "app", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

try {
  // Check if directory exists
  if (!fs.existsSync(imageDir)) {
    console.error(`Directory does not exist: ${imageDir}`);
    process.exit(1);
  }

  // Read all files in the directory
  const files = fs.readdirSync(imageDir);

  // Filter for image files (png, jpg, jpeg, webp, gif)
  const imageFiles = files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext);
  });

  console.log(`Found ${imageFiles.length} image files in ${imageDir}`);

  // Map to the format needed by the API
  const images = imageFiles.map((file) => ({
    name: file,
    url: `/images/hp-art-grid-collection/${file}`,
    source: "local",
  }));

  // Write the list to a JSON file
  fs.writeFileSync(outputFile, JSON.stringify(images, null, 2));
  console.log(`Successfully generated image list at ${outputFile}`);
} catch (error) {
  console.error("Error generating image list:", error);
  process.exit(1);
}
