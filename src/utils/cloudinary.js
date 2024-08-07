import cloudinary from "cloudinary";
import path from "path";
import DataURIParser from "datauri/parser.js";
import getenv from "../config/dotenv.js";

export const configureCloudinary = async () => {
  try {
    cloudinary.v2.config({
      cloud_name: getenv("CLOUDINARY_CLIENT_NAME"),
      api_key: getenv("CLOUDINARY_CLIENT_KEY"),
      api_secret: getenv("CLOUDINARY_CLIENT_SECRET"),
    });
    console.log("Cloudinary configured successfully");
  } catch (error) {
    console.error("Error configuring Cloudinary:", error);
  }
};
// UPLOAD FILE ON CLOUDINARY
// =========================
export const uploadOnCloudinary = async (file, subFolder, resourceType = "image") => {
  try {
    if (!file || !subFolder) throw new Error("File and subFolder are required for upload on Cloudinary");
    const parser = new DataURIParser();
    const extName = path.extname(file.originalname).toString();
    const url = parser.format(extName, file.buffer);
    const fileName = url?.content;
    if (!fileName) throw new Error("Error occurred while parsing file");

    const response = await cloudinary.v2.uploader.upload(fileName, {
      resource_type: resourceType,
      folder: `smart-task/${subFolder}`,
    });
    console.log(`${resourceType.toUpperCase()} uploaded successfully on cloudinary`);
    return response;
  } catch (error) {
    console.error(`Error occurred while uploading ${resourceType.toUpperCase()} on Cloudinary`, error);
    return null;
  }
};

// REMOVE FILE FROM CLOUDINARY
// ===========================
export const removeFromCloudinary = async (fileName, resourceType = "image") => {
  try {
    const response = await cloudinary.v2.uploader.destroy(fileName, {
      resource_type: resourceType,
    });
    console.log(`${resourceType.toUpperCase()} deleted successfully from cloudinary`);
    return response;
  } catch (error) {
    console.error(`Error occurred while removing ${resourceType.toUpperCase()}  from Cloudinary`, error);
    return null;
  }
};
