import multer from "multer";

const storage = multer.memoryStorage();

const singleUpload = multer({ storage }).single("file");

const multipleUpload = multer({ storage }).array("files");

export { singleUpload, multipleUpload };
