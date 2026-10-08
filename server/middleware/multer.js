const multer = require("multer");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "/tmp");
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    },
});

// No size/type limit here meant unbounded "image" uploads could fill /tmp
// before the Cloudinary resize step (config/FileHandling.js) ever runs,
// and any file type was accepted. Cap size and restrict to images/video,
// matching what the resize pipeline actually expects.
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB/file; resize pipeline targets 1.5-5MB
    files: 20,
  },
  fileFilter: (req, file, cb) => {
    cb(null, /^(image|video)\//.test(file.mimetype));
  },
});

module.exports = upload;