// src/server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// ==========================================
// MIDDLEWARE CONFIGURATION
// ==========================================
app.use(cors({
    origin: "http://localhost:3000", // Allow requests from Next.js frontend
    credentials: true                // Required to send/receive HTTP-only cookies
}));
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

// ==========================================
// 1. AUTHENTICATION API ROUTES (.env Based)
// ==========================================

// POST: Login API
app.post("/api/auth/login", (req, res): any => {
    const { username, password } = req.body;
    
    let role = null;
    let loggedInUser = null;

    // Check Admin
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        role = "admin";
        loggedInUser = username;
    } 
    // Check Supervisor 1
    else if (username === process.env.SUP1_USER && password === process.env.SUP1_PASS) {
        role = "supervisor";
        loggedInUser = username;
    } 
    // Check Supervisor 2
    else if (username === process.env.SUP2_USER && password === process.env.SUP2_PASS) {
        role = "supervisor";
        loggedInUser = username;
    }

    if (!role) {
        return res.status(401).json({ error: "Invalid username or password!" });
    }

    // Generate JWT Token (Saving BOTH role and exact username in the token)
    const token = jwt.sign({ username: loggedInUser, role }, JWT_SECRET, { expiresIn: "24h" });

    // Set Secure HTTP-Only Cookie
    res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000 // 1 Day
    });

    return res.json({ success: true, role, username: loggedInUser });
});

// POST: Logout API
app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("authToken");
    res.json({ success: true });
});

// GET: Get currently logged-in user details from cookie
app.get("/api/auth/me", (req: any, res: any) => {
    const token = req.cookies.authToken;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json(decoded); 
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
});

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================
const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.authToken;
    if (!token) {
        return res.status(401).json({ error: "Access Denied. Please login." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token." });
    }
};

// ==========================================
// 2. NTPL PROJECT MODULES (API ROUTES)
// ==========================================

// GET: Fetch all project sites (Auto-seeds dummy data if empty)
app.get("/api/projects", async (req, res) => {
    try {
        let projects = await prisma.projectSite.findMany({
            orderBy: { createdAt: "desc" }
        });

        // Insert dummy data if the database is currently empty
        // if (projects.length === 0) {
        //     const dummyData = [
        //         { siteName: "Pune Solar Array", location: "Hinjewadi", state: "Maharashtra", civilStatus: "COMPLETED", structuralStatus: "PANELS_MOUNTED" },
        //         { siteName: "Mumbai Tech Park", location: "Andheri", state: "Maharashtra", civilStatus: "IN_PROGRESS", structuralStatus: "MATERIAL_ARRIVED" },
        //         { siteName: "Nagpur Green Field", location: "MIHAN", state: "Maharashtra", civilStatus: "PENDING", structuralStatus: "PENDING" },
        //         { siteName: "Nashik Grid 1", location: "Ozar", state: "Maharashtra", civilStatus: "COMPLETED", structuralStatus: "FRAME_FITTED" },
        //         { siteName: "Aurangabad Plant", location: "Waluj", state: "Maharashtra", civilStatus: "IN_PROGRESS", structuralStatus: "PENDING" },
        //         { siteName: "Thane Commercial Rooftop", location: "Thane West", state: "Maharashtra", civilStatus: "COMPLETED", structuralStatus: "COMPLETED" }
        //     ];
            
        //     await prisma.projectSite.createMany({ data: dummyData });
            
        //     // Fetch again after inserting
        //     projects = await prisma.projectSite.findMany({
        //         orderBy: { createdAt: "desc" }
        //     });
        //     console.log("Seeded 6 dummy projects into the database.");
        // }

        res.json(projects);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch projects" });
    }
});

// POST: Create a new project site
app.post("/api/projects", authenticate, async (req: any, res: any) => {
    try {
        const { siteName, location, state } = req.body;
        const currentUser = req.user.username;
        
        const newProject = await prisma.projectSite.create({
            data: {
                siteName,
                location,
                state,
            }
        });

        // Activity Log Record
        await prisma.activityLog.create({
            data: {
                username: currentUser,
                action: "PROJECT_CREATED",
                details: `Created project site ${siteName}`,
                projectId: newProject.id
            }
        });

        res.status(201).json(newProject);
    } catch (error) {
        res.status(500).json({ error: "Failed to create project site" });
    }
});

// PUT: Update an existing project's status
app.put("/api/projects/:id", authenticate, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { civilStatus, structuralStatus } = req.body;
        const currentUser = req.user.username; 
        
        const updatedProject = await prisma.projectSite.update({
            where: { id },
            data: { 
                ...(civilStatus && { civilStatus }),
                ...(structuralStatus && { structuralStatus })
            }
        });

        // ACTIVITY LOG RECORD
        let detailsText = "";
        if (civilStatus) detailsText = `Updated Civil Status to ${civilStatus}`;
        if (structuralStatus) detailsText = `Updated Structural Status to ${structuralStatus}`;

        await prisma.activityLog.create({
            data: {
                username: currentUser,
                action: "STATUS_UPDATE",
                details: detailsText,
                projectId: id
            }
        });

        res.json(updatedProject);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update project status" });
    }
});

// GET: Fetch Activity Logs for a project (History)
app.get("/api/projects/:id/logs", async (req, res) => {
    try {
        const { id } = req.params;
        const logs = await prisma.activityLog.findMany({
            where: { projectId: id },
            orderBy: { createdAt: "desc" }
        });
        res.json(logs);
    } catch (error) {
        console.error("Failed to fetch logs:", error);
        res.status(500).json({ error: "Failed to fetch activity logs" });
    }
});

// ==========================================
// 3. IMAGE UPLOAD CONFIGURATION (MULTER)
// ==========================================

const uploadDir = path.join(process.cwd(), "public/uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));

// POST: Upload image and save URL to Database
app.post("/api/upload", authenticate, upload.single("siteImage"), async (req: any, res: any) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }

        const { projectId, phase } = req.body;
        const currentUser = req.user.username; 
        
        if (!projectId || !phase) {
            return res.status(400).json({ error: "Project ID and Phase are required" });
        }

        const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;

        const newImageRecord = await prisma.siteImage.create({
            data: {
                url: imageUrl,
                phase: phase,
                projectId: projectId,
                uploadedBy: currentUser 
            }
        });

        await prisma.activityLog.create({
            data: {
                username: currentUser,
                action: "PHOTO_UPLOAD",
                details: `Uploaded photo for ${phase}`,
                projectId: projectId
            }
        });

        res.status(201).json({ 
            message: "Image uploaded and saved to DB successfully", 
            image: newImageRecord 
        });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: "Failed to process image upload" });
    }
});

// GET: Fetch all images for a specific project
app.get("/api/projects/:id/images", async (req, res) => {
    try {
        const { id } = req.params;
        const images = await prisma.siteImage.findMany({
            where: { projectId: id },
            orderBy: { createdAt: 'desc' } 
        });
        res.json(images);
    } catch (error) {
        console.error("Failed to fetch images:", error);
        res.status(500).json({ error: "Failed to fetch images" });
    }
});

// ==========================================
// 4. BILLING & FINANCE MODULE (With Audit Logging)
// ==========================================

// GET: Fetch billing data (Auto-creates 3 milestones if they don't exist)
app.get("/api/billing", async (req, res) => {
  try {
    const projects = await prisma.projectSite.findMany({
      include: { milestones: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' }
    });

    const updatedProjects = await Promise.all(projects.map(async (site) => {
      if (site.milestones.length === 0) {
        const baseAmount = 125000;
        const gstAmount = baseAmount * 0.18;
        await prisma.paymentMilestone.createMany({
          data: [
            { projectId: site.id, name: "70% Payment (Advance & Material)", amount: baseAmount * 0.70 },
            { projectId: site.id, name: "GST Component (18%)", amount: gstAmount },
            { projectId: site.id, name: "30% Payment (Installation & Commissioning)", amount: baseAmount * 0.30 }
          ]
        });
        return await prisma.projectSite.findUnique({ where: { id: site.id }, include: { milestones: { orderBy: { createdAt: 'asc' } } }});
      }
      return site;
    }));

    res.json(updatedProjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch billing data" });
  }
});

// POST: Setup/Generate Billing (Amount Set)
app.post("/api/billing/generate/:id", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { baseAmount } = req.body;
    const currentUser = req.user.username;

    const base = Number(baseAmount);
    const gst = base * 0.18;

    await prisma.paymentMilestone.deleteMany({ where: { projectId: id } });

    await prisma.paymentMilestone.createMany({
      data: [
        { projectId: id, name: "70% Payment (Advance & Material)", amount: base * 0.70 },
        { projectId: id, name: "GST Component (18%)", amount: gst },
        { projectId: id, name: "30% Payment (Installation & Commissioning)", amount: base * 0.30 }
      ]
    });

    await prisma.activityLog.create({
      data: {
        username: currentUser,
        action: "BILLING_SETUP",
        details: `Initialized billing with base amount ₹${base}`,
        projectId: id
      }
    });

    const updatedSite = await prisma.projectSite.findUnique({
      where: { id },
      include: { milestones: { orderBy: { createdAt: 'asc' } } }
    });

    res.json(updatedSite);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate billing" });
  }
});

// PUT: Update milestone amount dynamically from UI (Inline Edit with Pencil)
app.put("/api/billing/milestone/:id", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const currentUser = req.user.username;

    const updated = await prisma.paymentMilestone.update({
      where: { id },
      data: { amount: Number(amount) }
    });

    await prisma.activityLog.create({
      data: {
        username: currentUser,
        action: "BILLING_UPDATE",
        details: `Updated milestone '${updated.name}' amount to ₹${amount}`,
        projectId: updated.projectId
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update amount" });
  }
});

// PUT: Collect payment (Marks a milestone as PAID)
app.put("/api/billing/collect/:milestoneId", authenticate, async (req: any, res: any) => {
  try {
    const { milestoneId } = req.params;
    const currentUser = req.user.username;

    const updated = await prisma.paymentMilestone.update({
      where: { id: milestoneId },
      data: { status: "PAID", paidAt: new Date() }
    });

    await prisma.activityLog.create({
      data: {
        username: currentUser,
        action: "PAYMENT_COLLECTED",
        details: `Collected payment for '${updated.name}' amounting to ₹${updated.amount}`,
        projectId: updated.projectId
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to process payment" });
  }
});

// Start th₹29,50,000e Express server
app.listen(PORT as number, "0.0.0.0", () => {
    console.log(`NTPL Backend is running on http://localhost:${PORT}`);
    console.log(`Also accessible via http://127.0.0.1:${PORT}`);
});