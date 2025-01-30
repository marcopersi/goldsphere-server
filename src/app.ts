import dotenv from "dotenv";
dotenv.config();
import express from "express";
import referenceRouter from "./routes/references";
import productsRouter from "./routes/products";
import custodiansRouter from "./routes/custodians";
import portfolioRouter from "./routes/portfolio";
import orderRouter from "./routes/orders";
import userRouter from "./routes/users";
import currencyRouter from "./routes/currency";
import custodyServiceRouter from "./routes/custodyService";
import positionRouter from "./routes/position";
import portfolioPositionRouter from "./routes/portfolioPosition";
import cors from "cors";

const app = express();
app.use(express.json());

// Konfigurieren Sie CORS
const corsOptions = {
    origin: "http://localhost:3333",
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Authorization"
  };

app.use(cors(corsOptions));

// Register routes
console.log("1. Registering reference routes");
app.use("/api/references", referenceRouter);
console.log("2. Registering product routes");
app.use("/api", productsRouter);
console.log("3. Registering custodian routes");
app.use("/api", custodiansRouter);
console.log("4. Registering portfolio routes");
app.use("/api", portfolioRouter);
console.log("5. Registering order routes");
app.use("/api", orderRouter);
console.log("6. Registering user routes");
app.use("/api", userRouter);
console.log("7. Registering currency routes");
app.use("/api/references", currencyRouter);
console.log("8. Registering custody service routes");
app.use("/api", custodyServiceRouter);
console.log("9. Registering position routes");
app.use("/api", positionRouter);
console.log("10. Registering portfolio position routes");
app.use("/api", portfolioPositionRouter);

export default app;