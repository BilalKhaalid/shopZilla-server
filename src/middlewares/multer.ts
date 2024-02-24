import multer from "multer";
import { v4 as uuid4 } from "uuid";
import { extname } from "node:path";

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, "uploads/");
  },
  filename(req, file, callback) {
    const uniqueId = uuid4();
    const fileName = uniqueId + extname(file.originalname);

    callback(null, fileName);
  },
});

export const singleUpload = multer({ storage }).single("picture");
