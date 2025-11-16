const cloudinary = require('cloudinary').v2;

// Support either CLOUDINARY_URL or individual keys (with multiple naming variants)
const fromEnv = () => {
  // If CLOUDINARY_URL is present, Cloudinary can auto-config from it
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
    return;
  }
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME || process.env.Cloudinary_Cloud_Name;
  const api_key = process.env.CLOUDINARY_API_KEY || process.env.Cloudinary_API_Key;
  const api_secret = process.env.CLOUDINARY_API_SECRET || process.env.Cloudinary_API_Secret;
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
};

fromEnv();

module.exports = cloudinary;
