const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'netwatch_secure_owner_jwt_secret_key_2026';

if (!process.env.JWT_SECRET) {
  console.warn('[WARNING] JWT_SECRET environment variable is not set. Using an insecure default secret.');
  console.warn('[WARNING] Set JWT_SECRET in your environment (e.g. a .env file or hosting provider config) before deploying to production.');
}

// If the app is running behind a reverse proxy (Render, Railway, Heroku, Nginx, etc.)
// this makes Express trust the proxy's X-Forwarded-* headers so req.secure / secure cookies
// behave correctly. Safe no-op for plain local/http deployments.
app.set('trust proxy', 1);

// Shared cookie options used for both setting and clearing the admin session cookie.
// Kept in one place so login/logout always agree on Path/SameSite/Secure — mismatched
// attributes are a common reason a "successful" login doesn't actually persist.
function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production', // requires HTTPS in production
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
}

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Initial Data Seed
function getInitialData() {
  const defaultPasswordHash = bcrypt.hashSync('admin123', 10);
  return {
    admin: {
      username: 'admin',
      passwordHash: defaultPasswordHash
    },
    siteContent: {
      heroEyebrow: "IMOU authorised reseller",
      heroTitle: "Watch every entrance, from wherever you are.",
      heroSubtitle: "NetWatchShop stocks IMOU security cameras, recorders and storage, plus everyday computer accessories — all handled directly, order to delivery, over WhatsApp.",
      aboutTitle: "A straightforward place to buy security gear",
      aboutLead: "NetWatchShop sells security cameras, recorders, storage cards and computer accessories, including the IMOU and Logitech ranges shown on this site. We keep things simple: browse what's in stock, then message us directly to check availability, ask questions, and place your order.",
      whatsapp: "03243249829",
      whatsappRaw: "923243249829",
      instagram: "netwatchshop",
      instagramLink: "https://instagram.com/netwatchshop",
      tiktok: "netwatchshop",
      tiktokLink: "https://tiktok.com/@netwatchshop",
      youtube: "NetWatch Technology",
      youtubeLink: "https://www.youtube.com/results?search_query=NetWatch+Technology"
    },
    video: {
      url: "/assets/video/camera-demo.mp4",
      poster: "/assets/images/camera-ad-hero.jpg",
      title: "See it in action",
      eyebrow: "Product in action"
    },
    products: [
      {
        id: "p1",
        name: "IMOU 3K Solar Outdoor Camera",
        price: "29500",
        description: "High performance 3K solar-powered outdoor battery camera with 5W solar panel, human & vehicle detection, and 24/7 recording.",
        specifications: "3K clarity · solar-powered · human & vehicle detection · 24/7 recording",
        image: "/assets/images/camera-product-shot.jpg",
        visible: true,
        inStock: true,
        createdAt: Date.now()
      },
      {
        id: "p2",
        name: "IMOU Smart Wi-Fi Recorder N110W",
        price: "",
        description: "8-channel Wi-Fi NVR recorder with dual-band Wi-Fi 6 and HDMI/VGA output for high-definition security feeds.",
        specifications: "8-channel · H.265 · dual-band Wi-Fi 6 · HDMI/VGA output",
        image: "/assets/images/nvr-box.jpg",
        visible: true,
        inStock: true,
        createdAt: Date.now() - 1000
      },
      {
        id: "p3",
        name: "IMOU S1 64GB Memory Card",
        price: "",
        description: "Specialized high-endurance microSD card designed for continuous video surveillance and security camera recording.",
        specifications: "microSDHC · Class 10 · U3 · V30 · built for security recording",
        image: "/assets/images/sdcard-box.jpg",
        visible: true,
        inStock: true,
        createdAt: Date.now() - 2000
      },
      {
        id: "p4",
        name: "Logitech B100 Wired Mouse",
        price: "2200",
        description: "Comfortable ambidextrous full-size wired USB optical mouse built with recycled materials.",
        specifications: "Plug-and-play USB · full-size design · 72% recycled plastic",
        image: "/assets/images/mouse-box.jpg",
        visible: true,
        inStock: true,
        createdAt: Date.now() - 3000
      }
    ],
    gallery: [
      { id: "g1", image: "/assets/images/camera-ad-hero.jpg", caption: "IMOU 3K Solar Outdoor Camera packaging and features", span: "span-2" },
      { id: "g2", image: "/assets/images/camera-installed.jpg", caption: "Camera mounted above a doorway with solar panel", span: "" },
      { id: "g3", image: "/assets/images/nvr-ad-1.jpg", caption: "IMOU N110W recorder shown on a console table", span: "" },
      { id: "g4", image: "/assets/images/nvr-ad-2.jpg", caption: "IMOU N110W recorder with live camera feed on a monitor", span: "" },
      { id: "g5", image: "/assets/images/sdcard-ad.jpg", caption: "IMOU S1 64GB memory card packaging detail", span: "" },
      { id: "g6", image: "/assets/images/sdcard-photo.jpg", caption: "IMOU S1 memory card held in hand at the shop", span: "" },
      { id: "g7", image: "/assets/images/mouse-ad-1.jpg", caption: "Logitech B100 wired mouse packaging detail", span: "" },
      { id: "g8", image: "/assets/images/mouse-ad-2.jpg", caption: "Logitech B100 mouse in use on a desk", span: "span-2" },
      { id: "g9", image: "/assets/images/mouse-ad-branded.jpg", caption: "Logitech B100 wired mouse, NetWatchShop listing", span: "" }
    ]
  };
}

// Database helper functions
function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    const data = getInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return data;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    // Defensive check: if db.json was ever manually edited/corrupted and lost its
    // admin credentials, re-seed just the admin block instead of crashing the
    // login route with "Cannot read properties of undefined (reading 'username')".
    if (!data.admin || !data.admin.username || !data.admin.passwordHash) {
      console.warn('[WARNING] admin credentials missing from data/db.json — restoring default admin account (username: admin, password: admin123). Change this password after logging in.');
      data.admin = getInitialData().admin;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    }
    return data;
  } catch (err) {
    console.error("Error reading database, resetting to seed data:", err);
    const data = getInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return data;
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Initialize database file on startup
readDb();

// Multer Storage for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max (for videos)
  fileFilter: function (req, file, cb) {
    const allowed = /jpeg|jpg|png|webp|gif|mp4|webm|mov|mkv/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mime = file.mimetype.toLowerCase();
    if (allowed.test(ext) || allowed.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error('Only images and video files are allowed!'));
    }
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// NOTE: Admin panel authentication is now handled entirely by Supabase Auth
// on the client side (see admin.js -> checkAuthentication()), not by the old
// JWT-cookie system below. That old system is kept only for its /api routes;
// it must NOT gate access to /admin.html anymore, since login.html no longer
// sets the "netwatch_admin_token" cookie it depends on. Gating on it here
// would permanently redirect everyone back to /login.html even after a
// successful Supabase login.
app.get('/admin', (req, res) => res.redirect('/admin.html'));

// Since express.static(__dirname) below serves the whole project folder,
// block access to source/config files that should never be downloadable.
app.use((req, res, next) => {
  var blockedPrefixes = [
    '/server.js', '/data', '/package.json', '/package-lock.json', '/node_modules'
  ];
  var blocked = blockedPrefixes.some(function (p) {
    return req.path === p || req.path.indexOf(p + '/') === 0;
  });
  if (blocked) {
    return res.status(404).end();
  }
  next();
});

// Serve static assets from the project root
app.use(express.static(__dirname));

// Owner Auth Middleware
function requireAuth(req, res, next) {
  let token = req.cookies.netwatch_admin_token;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Owner access required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

/* =========================================================
   PUBLIC API ENDPOINTS
   ========================================================= */

// Get public website data (Products, Gallery, Video, Content)
app.get('/api/public-data', (req, res) => {
  const db = readDb();
  // Filter products for public view: only visible products
  const visibleProducts = (db.products || []).filter(p => p.visible !== false);
  res.json({
    success: true,
    siteContent: db.siteContent,
    video: db.video,
    products: visibleProducts,
    gallery: db.gallery
  });
});

// Get Products (Public vs Admin)
app.get('/api/products', (req, res) => {
  const db = readDb();
  // Check if admin token provided to show all products
  let isAdmin = false;
  let token = req.cookies.netwatch_admin_token;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') token = parts[1];
  }
  if (token) {
    try { jwt.verify(token, JWT_SECRET); isAdmin = true; } catch (e) {}
  }

  const products = isAdmin ? (db.products || []) : (db.products || []).filter(p => p.visible !== false);
  res.json({ success: true, products });
});

/* =========================================================
   AUTH ENDPOINTS
   ========================================================= */

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  const db = readDb();
  if (username !== db.admin.username) {
    return res.status(401).json({ success: false, message: 'Invalid username or password.' });
  }

  const match = bcrypt.compareSync(password, db.admin.passwordHash);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Invalid username or password.' });
  }

  const token = jwt.sign({ username: db.admin.username, role: 'owner' }, JWT_SECRET, { expiresIn: '7d' });

  // Set HTTP-only cookie
  res.cookie('netwatch_admin_token', token, getAuthCookieOptions());

  res.json({ success: true, message: 'Login successful.', token, username: db.admin.username });
});

// Auth Check
app.get('/api/auth/check', (req, res) => {
  let token = req.cookies.netwatch_admin_token;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') token = parts[1];
  }

  if (!token) {
    return res.json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ authenticated: true, username: decoded.username });
  } catch (err) {
    return res.json({ authenticated: false });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  // clearCookie must be called with matching Path/SameSite/Secure attributes,
  // otherwise some browsers will not remove the cookie and the session can
  // appear to "survive" logout.
  res.clearCookie('netwatch_admin_token', getAuthCookieOptions());
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Change Password
app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
  }

  const db = readDb();
  const match = bcrypt.compareSync(currentPassword, db.admin.passwordHash);
  if (!match) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
  }

  db.admin.passwordHash = bcrypt.hashSync(newPassword, 10);
  writeDb(db);
  res.json({ success: true, message: 'Password changed successfully.' });
});

/* =========================================================
   PROTECTED ADMIN PRODUCT MANAGEMENT
   ========================================================= */

// Add Product
app.post('/api/products', requireAuth, upload.single('imageFile'), (req, res) => {
  const db = readDb();
  const { name, price, description, specifications, visible, inStock, imageUrl } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Product name is required.' });
  }

  let finalImage = '/assets/images/camera-product-shot.jpg';
  if (req.file) {
    finalImage = '/uploads/' + req.file.filename;
  } else if (imageUrl && imageUrl.trim()) {
    finalImage = imageUrl.trim();
  }

  const newProduct = {
    id: 'p_' + Date.now(),
    name: name.trim(),
    price: price !== undefined ? price.toString().trim() : '',
    description: (description || '').trim(),
    specifications: (specifications || '').trim(),
    image: finalImage,
    visible: visible === 'false' || visible === false ? false : true,
    inStock: inStock === 'false' || inStock === false ? false : true,
    createdAt: Date.now()
  };

  db.products.unshift(newProduct);
  writeDb(db);

  res.json({ success: true, message: 'Product created successfully.', product: newProduct });
});

// Edit Product
app.put('/api/products/:id', requireAuth, upload.single('imageFile'), (req, res) => {
  const db = readDb();
  const productId = req.params.id;
  const index = db.products.findIndex(p => p.id === productId);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  const { name, price, description, specifications, visible, inStock, imageUrl, removeImage } = req.body;

  let product = db.products[index];

  if (name !== undefined) product.name = name.trim();
  if (price !== undefined) product.price = price.toString().trim();
  if (description !== undefined) product.description = description.trim();
  if (specifications !== undefined) product.specifications = specifications.trim();
  if (visible !== undefined) product.visible = (visible === 'true' || visible === true);
  if (inStock !== undefined) product.inStock = (inStock === 'true' || inStock === true);

  if (req.file) {
    product.image = '/uploads/' + req.file.filename;
  } else if (imageUrl && imageUrl.trim()) {
    product.image = imageUrl.trim();
  } else if (removeImage === 'true' || removeImage === true) {
    product.image = '';
  }

  db.products[index] = product;
  writeDb(db);

  res.json({ success: true, message: 'Product updated successfully.', product });
});

// Toggle Product Visibility
app.post('/api/products/:id/toggle-visibility', requireAuth, (req, res) => {
  const db = readDb();
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }
  product.visible = !product.visible;
  writeDb(db);
  res.json({ success: true, message: `Product ${product.visible ? 'visible' : 'hidden'}`, visible: product.visible });
});

// Toggle Product Stock Status
app.post('/api/products/:id/toggle-stock', requireAuth, (req, res) => {
  const db = readDb();
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }
  product.inStock = product.inStock === false ? true : false;
  writeDb(db);
  res.json({ success: true, message: `Product marked ${product.inStock ? 'In Stock' : 'Out of Stock'}`, inStock: product.inStock });
});

// Delete Product
app.delete('/api/products/:id', requireAuth, (req, res) => {
  const db = readDb();
  const productId = req.params.id;
  const initialLength = db.products.length;
  db.products = db.products.filter(p => p.id !== productId);

  if (db.products.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  writeDb(db);
  res.json({ success: true, message: 'Product deleted successfully.' });
});

/* =========================================================
   PROTECTED GALLERY MANAGEMENT
   ========================================================= */

// Add Gallery Image(s)
app.post('/api/gallery', requireAuth, upload.array('images', 10), (req, res) => {
  const db = readDb();
  const { caption, span, imageUrl } = req.body;

  let addedItems = [];

  if (req.files && req.files.length > 0) {
    req.files.forEach((file, i) => {
      const newItem = {
        id: 'g_' + Date.now() + '_' + i,
        image: '/uploads/' + file.filename,
        caption: (caption || '').trim(),
        span: (span || '').trim()
      };
      db.gallery.push(newItem);
      addedItems.push(newItem);
    });
  } else if (imageUrl && imageUrl.trim()) {
    const newItem = {
      id: 'g_' + Date.now(),
      image: imageUrl.trim(),
      caption: (caption || '').trim(),
      span: (span || '').trim()
    };
    db.gallery.push(newItem);
    addedItems.push(newItem);
  } else {
    return res.status(400).json({ success: false, message: 'Please upload an image file or provide an image URL.' });
  }

  writeDb(db);
  res.json({ success: true, message: 'Gallery updated successfully.', items: addedItems });
});

// Delete Gallery Image
app.delete('/api/gallery/:id', requireAuth, (req, res) => {
  const db = readDb();
  const galleryId = req.params.id;
  const initialLength = db.gallery.length;
  db.gallery = db.gallery.filter(g => g.id !== galleryId);

  if (db.gallery.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Gallery item not found.' });
  }

  writeDb(db);
  res.json({ success: true, message: 'Gallery item deleted.' });
});

/* =========================================================
   PROTECTED VIDEO MANAGEMENT
   ========================================================= */

// Upload / Update Video
app.post('/api/video', requireAuth, upload.fields([{ name: 'videoFile', maxCount: 1 }, { name: 'posterFile', maxCount: 1 }]), (req, res) => {
  const db = readDb();
  const { videoUrl, posterUrl, title, eyebrow } = req.body;

  if (req.files && req.files.videoFile && req.files.videoFile[0]) {
    db.video.url = '/uploads/' + req.files.videoFile[0].filename;
  } else if (videoUrl && videoUrl.trim()) {
    db.video.url = videoUrl.trim();
  }

  if (req.files && req.files.posterFile && req.files.posterFile[0]) {
    db.video.poster = '/uploads/' + req.files.posterFile[0].filename;
  } else if (posterUrl && posterUrl.trim()) {
    db.video.poster = posterUrl.trim();
  }

  if (title !== undefined) db.video.title = title.trim();
  if (eyebrow !== undefined) db.video.eyebrow = eyebrow.trim();

  writeDb(db);
  res.json({ success: true, message: 'Video configuration updated successfully.', video: db.video });
});

/* =========================================================
   PROTECTED WEBSITE CONTENT MANAGEMENT
   ========================================================= */

// Update Site Content
app.put('/api/content', requireAuth, (req, res) => {
  const db = readDb();
  const {
    heroEyebrow, heroTitle, heroSubtitle,
    aboutTitle, aboutLead,
    whatsapp, instagram, tiktok, youtube
  } = req.body;

  if (heroEyebrow !== undefined) db.siteContent.heroEyebrow = heroEyebrow.trim();
  if (heroTitle !== undefined) db.siteContent.heroTitle = heroTitle.trim();
  if (heroSubtitle !== undefined) db.siteContent.heroSubtitle = heroSubtitle.trim();

  if (aboutTitle !== undefined) db.siteContent.aboutTitle = aboutTitle.trim();
  if (aboutLead !== undefined) db.siteContent.aboutLead = aboutLead.trim();

  if (whatsapp !== undefined) {
    const rawNumber = whatsapp.replace(/\D/g, '');
    db.siteContent.whatsapp = whatsapp.trim();
    db.siteContent.whatsappRaw = rawNumber.startsWith('0') ? '92' + rawNumber.substring(1) : rawNumber;
    db.siteContent.whatsappLink = `https://wa.me/${db.siteContent.whatsappRaw}`;
  }

  if (instagram !== undefined) {
    db.siteContent.instagram = instagram.trim().replace('@', '');
    db.siteContent.instagramLink = `https://instagram.com/${db.siteContent.instagram}`;
  }

  if (tiktok !== undefined) {
    db.siteContent.tiktok = tiktok.trim().replace('@', '');
    db.siteContent.tiktokLink = `https://tiktok.com/@${db.siteContent.tiktok}`;
  }

  if (youtube !== undefined) {
    db.siteContent.youtube = youtube.trim();
    db.siteContent.youtubeLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(db.siteContent.youtube)}`;
  }

  writeDb(db);
  res.json({ success: true, message: 'Website content updated successfully.', siteContent: db.siteContent });
});

// Catch-all route to serve public index.html for client-side navigation
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`NetWatchShop Server is running on http://localhost:${PORT}`);
  console.log(`Public Website: http://localhost:${PORT}/`);
  console.log(`Admin Login: http://localhost:${PORT}/login.html`);
  console.log(`Admin Panel: http://localhost:${PORT}/admin.html`);
  console.log(`====================================================`);
});
