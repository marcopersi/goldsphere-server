import express, { Request, Response } from "express";
import dotenv from "dotenv";
import referenceRoutes from "./routes/references";
import products from "./routes/products";

dotenv.config();

const app = express();
const port = process.env.PORT || 11215;

// Middleware
app.use(express.json());

// Log all incoming requests
app.use((req: Request, res: Response, next) => {
  console.log(`Received ${req.method} request for ${req.url}`);
  next();
});

// Register routes
console.log("Registering reference routes");
app.use("/api", referenceRoutes);
app.use("/api", products);

// Beispiel-Route
app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to GoldSphere Backend!");
});

// Server starten
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
