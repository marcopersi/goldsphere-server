import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import app from "./app";

dotenv.config();

const PORT = process.env.PORT || 8080;

// Basic error handling
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 GoldSphere Server running on port ${PORT}`);
});