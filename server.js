const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();

app.use(cors());
app.use(express.json());

const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// serve static สำหรับรูป
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// เก็บสินค้าเป็น array
let products = [];
let nextId = 1;

// ดึงสินค้า list ทั้งหมด
app.get("/api/products", (req, res) => {
  const result = products.map(p => ({
    ...p,
    imageUrl: p.image ? `${req.protocol}://${req.get("host")}/uploads/${p.image}` : null,
  }));
  res.json(result);
});

// เพิ่มสินค้าใหม่ (admin=true)
app.post("/api/products", upload.single("image"), (req, res) => {
  const isAdmin = req.query.admin === "true";
  if (!isAdmin) return res.status(403).json({ error: "Access denied" });

  const { name, available, retailPrice, wholesalePrice } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  const retail = parseFloat(retailPrice) || 0;
  const wholesale = parseFloat(wholesalePrice) || 0;

  let imageFilename = null;
  if (req.file) imageFilename = req.file.filename;

  const product = {
    id: nextId++,
    name,
    available: available === "true" || available === true,
    retailPrice: retail,
    wholesalePrice: wholesale,
    image: imageFilename,
  };
  products.push(product);

  res.json({ success: true, product });
});

// แก้ไขสินค้า (admin=true)
app.put("/api/products/:id", upload.single("image"), (req, res) => {
  const isAdmin = req.query.admin === "true";
  if (!isAdmin) return res.status(403).json({ error: "Access denied" });

  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const { name, available, retailPrice, wholesalePrice } = req.body;

  if (name !== undefined) product.name = name;
  if (available !== undefined) product.available = available === "true" || available === true;
  if (retailPrice !== undefined) product.retailPrice = parseFloat(retailPrice) || 0;
  if (wholesalePrice !== undefined) product.wholesalePrice = parseFloat(wholesalePrice) || 0;

  if (req.file) {
    if (product.image) {
      const oldPath = path.join(uploadDir, product.image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    product.image = req.file.filename;
  }

  res.json({ success: true, product });
});

// ลบสินค้า (admin=true)
app.delete("/api/products/:id", (req, res) => {
  const isAdmin = req.query.admin === "true";
  if (!isAdmin) return res.status(403).json({ error: "Access denied" });

  const id = parseInt(req.params.id);
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: "Product not found" });

  const product = products[index];
  if (product.image) {
    const oldPath = path.join(uploadDir, product.image);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  products.splice(index, 1);
  res.json({ success: true });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
