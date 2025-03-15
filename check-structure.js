const fs = require("fs")
const path = require("path")

// Function to check if a directory exists
function directoryExists(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory()
  } catch (err) {
    return false
  }
}

// Function to check if a file exists
function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile()
  } catch (err) {
    return false
  }
}

// Check project structure
console.log("Checking project structure...")

// Check root directories
const rootDirs = ["app", "components", "lib", "api"]
rootDirs.forEach((dir) => {
  const exists = directoryExists(dir)
  console.log(`Directory '${dir}': ${exists ? "✅ Found" : "❌ Missing"}`)
})

// Check important component files
const componentFiles = [
  "components/navbar.tsx",
  "components/sparkles.tsx",
  "components/hero.tsx",
  "components/protected-route.tsx",
]
componentFiles.forEach((file) => {
  const exists = fileExists(file)
  console.log(`Component '${file}': ${exists ? "✅ Found" : "❌ Missing"}`)
})

// Check lib files
const libFiles = ["lib/auth-context.tsx", "lib/utils.ts", "lib/api.ts"]
libFiles.forEach((file) => {
  const exists = fileExists(file)
  console.log(`Lib file '${file}': ${exists ? "✅ Found" : "❌ Missing"}`)
})

// Check API files
const apiFiles = [
  "api/__init__.py",
  "api/main.py",
  "api/run.py",
  "api/models.py",
  "api/auth.py",
  "api/datapuur.py",
  "api/kginsights.py",
  "api/admin.py",
]
apiFiles.forEach((file) => {
  const exists = fileExists(file)
  console.log(`API file '${file}': ${exists ? "✅ Found" : "❌ Missing"}`)
})

// Check package.json
if (fileExists("package.json")) {
  console.log("package.json: ✅ Found")
  // Check if dependencies are listed
  const packageJson = require("./package.json")
  const requiredDeps = ["framer-motion", "lucide-react", "next", "react", "react-dom"]
  requiredDeps.forEach((dep) => {
    const exists = packageJson.dependencies && packageJson.dependencies[dep]
    console.log(`Dependency '${dep}': ${exists ? "✅ Found" : "❌ Missing"}`)
  })
} else {
  console.log("package.json: ❌ Missing")
}

console.log("\nStructure check complete. Please fix any missing files or directories.")

