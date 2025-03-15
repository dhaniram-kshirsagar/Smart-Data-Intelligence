# Running ResearchAI on Windows with VS Code

This guide provides instructions for setting up and running the ResearchAI application on Windows using Visual Studio Code.

## Prerequisites

1. **Install Node.js**
   - Download and install from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version` and `npm --version`

2. **Install Python 3.8+**
   - Download and install from [python.org](https://python.org/)
   - Make sure to check "Add Python to PATH" during installation
   - Verify installation: `python --version` and `pip --version`

3. **Install Visual Studio Code**
   - Download and install from [code.visualstudio.com](https://code.visualstudio.com/)
   - Install recommended extensions:
     - Python extension
     - JavaScript and TypeScript support
     - ESLint
     - Prettier

## Setup

1. **Open the project in VS Code**
   - Open VS Code
   - File > Open Folder > Select the project folder

2. **Install dependencies**
   - Open a terminal in VS Code (Terminal > New Terminal)
   - Run: `npm run install:all`
   - This will install both frontend and backend dependencies

## Running the Application

### Option 1: Using the batch file

1. Run the Windows batch file:

