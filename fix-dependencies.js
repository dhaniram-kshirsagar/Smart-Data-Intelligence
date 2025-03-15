const { execSync } = require("child_process")
const fs = require("fs")

console.log("Checking and fixing dependencies...")

// Required dependencies
const requiredDependencies = {
  "framer-motion": "^10.16.4",
  "lucide-react": "^0.294.0",
  next: "^14.0.3",
  react: "^18.2.0",
  "react-dom": "^18.2.0",
  "@types/node": "^20.9.4",
  "@types/react": "^18.2.38",
  "@types/react-dom": "^18.2.17",
  typescript: "^5.3.2",
  tailwindcss: "^3.3.5",
  postcss: "^8.4.31",
  autoprefixer: "^10.4.16",
}

// Read package.json
let packageJson
try {
  packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"))
} catch (error) {
  console.error("Error reading package.json:", error.message)
  process.exit(1)
}

// Check if dependencies exist
const missingDeps = []
for (const [dep, version] of Object.entries(requiredDependencies)) {
  if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
    missingDeps.push(`${dep}@${version}`)
  }
}

// Install missing dependencies
if (missingDeps.length > 0) {
  console.log(`Installing missing dependencies: ${missingDeps.join(", ")}`)
  try {
    execSync(`npm install ${missingDeps.join(" ")}`, { stdio: "inherit" })
    console.log("Dependencies installed successfully!")
  } catch (error) {
    console.error("Error installing dependencies:", error.message)
    process.exit(1)
  }
} else {
  console.log("All required dependencies are already installed.")
}

console.log("Dependency check complete.")

