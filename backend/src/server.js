const app = require("./app");
const db = require("./config/database");

const port = process.env.PORT || 3000;

db.getConnection()
  .then((connection) => {
    console.log("✅ Connected to MySQL database successfully.");
    connection.release();
  })
  .catch((error) => {
    console.error("❌ Failed to connect to MySQL:", error.message);
  });

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
