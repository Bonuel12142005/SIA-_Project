import multer from "multer";

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PHOTO_SIZE,
    files: 1
  },
  fileFilter: (req, file, callback) => {
    const supportedTypes = new Set(["image/jpeg", "image/png", "image/gif"]);
    if (!supportedTypes.has(file.mimetype)) {
      return callback(new Error("Choose a PNG, JPG, or GIF equipment photo."));
    }
    callback(null, true);
  }
});

export const uploadEquipmentPhoto = (req, res, next) => {
  upload.single("photo")(req, res, (error) => {
    if (!error) return next();

    const message = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
      ? "Equipment photos must be 5 MB or smaller."
      : error.message;
    req.flash("error_msg", message);
    const redirectUrl = req.body.returnTo === "inventory"
      ? "/equipment"
      : req.params.id
        ? `/equipment/${req.params.id}/edit`
        : "/equipment";
    res.redirect(redirectUrl);
  });
};
