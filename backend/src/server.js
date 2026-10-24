require("dotenv").config();
if (!process.env.JWT_SECRET || !process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL o JWT_SECRET en el archivo .env");
  process.exit(1);
}
const app = require("./app");
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API FitSmart en http://localhost:${port}`));
