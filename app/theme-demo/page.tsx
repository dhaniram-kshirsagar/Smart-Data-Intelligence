"use client"

import { useState } from "react"
import Navbar from "@/components/navbar"
import { SparklesCore } from "@/components/sparkles"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useTheme } from "@/lib/theme-context"
import { motion } from "framer-motion"
import { Sun, Moon, Code, Palette, Type, Layout, ChevronRight } from "lucide-react"

export default function ThemeDemoPage() {
  const { theme, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState("colors")

  return (
    <main className="min-h-screen bg-background antialiased relative overflow-hidden">
      {/* Ambient background with moving particles */}
      <div className="h-full w-full absolute inset-0 z-0">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="w-full h-full"
          particleColor="var(--foreground)"
        />
      </div>

      <div className="relative z-10">
        <Navbar />

        <div className="container mx-auto px-4 py-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold mb-6 text-center"
          >
            Professional Theme Showcase
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl mb-8 text-center"
          >
            Exploring our refined color scheme and typography
          </motion.p>

          <div className="flex justify-center mb-8">
            <Button variant="outline" size="lg" onClick={toggleTheme} className="flex items-center gap-2 hover-effect">
              {theme === "dark" ? (
                <>
                  <Sun className="h-5 w-5" />
                  Switch to Light Mode
                </>
              ) : (
                <>
                  <Moon className="h-5 w-5" />
                  Switch to Dark Mode
                </>
              )}
            </Button>
          </div>

          <Tabs defaultValue="colors" className="max-w-4xl mx-auto">
            <TabsList className="grid grid-cols-3 mb-8">
              <TabsTrigger value="colors" onClick={() => setActiveTab("colors")}>
                <Palette className="h-4 w-4 mr-2" />
                Colors
              </TabsTrigger>
              <TabsTrigger value="typography" onClick={() => setActiveTab("typography")}>
                <Type className="h-4 w-4 mr-2" />
                Typography
              </TabsTrigger>
              <TabsTrigger value="components" onClick={() => setActiveTab("components")}>
                <Layout className="h-4 w-4 mr-2" />
                Components
              </TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="space-y-8">
              <Card className="shadow-md hover-effect">
                <CardHeader>
                  <CardTitle>Primary Colors</CardTitle>
                  <CardDescription>Main color palette used throughout the application</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col">
                      <div className="h-24 bg-primary rounded-t-md"></div>
                      <div className="p-4 border border-t-0 rounded-b-md">
                        <p className="font-bold">Primary</p>
                        <p className="text-sm text-muted-foreground">#1a237e</p>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="h-24 bg-secondary rounded-t-md"></div>
                      <div className="p-4 border border-t-0 rounded-b-md">
                        <p className="font-bold">Secondary</p>
                        <p className="text-sm text-muted-foreground">#00796b</p>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="h-24 bg-accent rounded-t-md"></div>
                      <div className="p-4 border border-t-0 rounded-b-md">
                        <p className="font-bold">Accent</p>
                        <p className="text-sm text-muted-foreground">#ffc107</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md hover-effect">
                <CardHeader>
                  <CardTitle>Background & Text Colors</CardTitle>
                  <CardDescription>Colors used for backgrounds and text</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex flex-col">
                      <div className="h-24 bg-background rounded-t-md border"></div>
                      <div className="p-4 border border-t-0 rounded-b-md">
                        <p className="font-bold">Background</p>
                        <p className="text-sm text-muted-foreground">{theme === "dark" ? "#0f1123" : "#f5f5f5"}</p>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="h-24 bg-card rounded-t-md"></div>
                      <div className="p-4 border border-t-0 rounded-b-md">
                        <p className="font-bold">Card</p>
                        <p className="text-sm text-muted-foreground">{theme === "dark" ? "#171a35" : "#ffffff"}</p>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="h-24 flex items-center justify-center bg-white dark:bg-gray-800 rounded-t-md">
                        <div className="w-16 h-16 rounded-full bg-foreground"></div>
                      </div>
                      <div className="p-4 border border-t-0 rounded-b-md">
                        <p className="font-bold">Foreground</p>
                        <p className="text-sm text-muted-foreground">{theme === "dark" ? "#f2f2f2" : "#212121"}</p>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="h-24 flex items-center justify-center bg-white dark:bg-gray-800 rounded-t-md">
                        <div className="w-16 h-16 rounded-full bg-black dark:bg-white"></div>
                      </div>
                      <div className="p-4 border border-t-0 rounded-b-md">
                        <p className="font-bold">Heading</p>
                        <p className="text-sm text-muted-foreground">{theme === "dark" ? "#ffffff" : "#000000"}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="typography" className="space-y-8">
              <Card className="shadow-md hover-effect">
                <CardHeader>
                  <CardTitle>Headings</CardTitle>
                  <CardDescription>System fonts similar to Roboto, sans-serif, bold</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h1 className="text-4xl">Heading 1 - The quick brown fox jumps over the lazy dog</h1>
                  <h2 className="text-3xl">Heading 2 - The quick brown fox jumps over the lazy dog</h2>
                  <h3 className="text-2xl">Heading 3 - The quick brown fox jumps over the lazy dog</h3>
                  <h4 className="text-xl">Heading 4 - The quick brown fox jumps over the lazy dog</h4>
                  <h5 className="text-lg">Heading 5 - The quick brown fox jumps over the lazy dog</h5>
                  <h6 className="text-base">Heading 6 - The quick brown fox jumps over the lazy dog</h6>
                </CardContent>
              </Card>

              <Card className="shadow-md hover-effect">
                <CardHeader>
                  <CardTitle>Body Text</CardTitle>
                  <CardDescription>System fonts similar to Open Sans, sans-serif, regular</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-lg">
                    This is a paragraph with larger text. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget
                    nisl.
                  </p>
                  <p>
                    This is a standard paragraph. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam
                    auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl.
                    Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget
                    nisl.
                  </p>
                  <p className="text-sm">
                    This is a smaller paragraph. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor,
                    nisl eget ultricies tincidunt, nisl nisl aliquam nisl.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-md hover-effect">
                <CardHeader>
                  <CardTitle>Monospace Text</CardTitle>
                  <CardDescription>Consolas for code snippets</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-md">
                    <code className="text-sm">
                      <pre>
                        {`function calculateTotal(items) {
  return items
    .map(item => item.price * item.quantity)
    .reduce((total, amount) => total + amount, 0);
}`}
                      </pre>
                    </code>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="components" className="space-y-8">
              <Card className="shadow-md hover-effect">
                <CardHeader>
                  <CardTitle>Buttons</CardTitle>
                  <CardDescription>Various button styles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Button>Default Button</Button>
                    <Button variant="secondary">Secondary Button</Button>
                    <Button variant="outline">Outline Button</Button>
                    <Button variant="ghost">Ghost Button</Button>
                    <Button variant="link">Link Button</Button>
                    <Button variant="destructive">Destructive Button</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md hover-effect">
                <CardHeader>
                  <CardTitle>Form Elements</CardTitle>
                  <CardDescription>Input fields and controls</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" placeholder="Enter your email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" placeholder="Enter your password" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="notifications" />
                      <Label htmlFor="notifications">Enable notifications</Label>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="ml-auto">Submit</Button>
                </CardFooter>
              </Card>

              <Card className="shadow-md hover-effect">
                <CardHeader>
                  <CardTitle>Professional Card</CardTitle>
                  <CardDescription>Example of a professional card with gradient and shadow</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-6 rounded-lg bg-gradient-to-br from-primary/5 to-secondary/5 border border-border">
                    <h3 className="text-xl font-semibold mb-3">Enterprise Solution</h3>
                    <p className="mb-4">
                      Our professional enterprise solution provides advanced analytics and insights for your business.
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold">
                        $499<span className="text-sm font-normal">/month</span>
                      </span>
                      <Button className="bg-primary text-white px-4 py-2 rounded-md flex items-center">
                        Get Started <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md hover-effect">
                <CardHeader>
                  <CardTitle>Code Block</CardTitle>
                  <CardDescription>Example of code with syntax highlighting</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="absolute top-2 right-2">
                      <Button variant="ghost" size="sm">
                        <Code className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="bg-muted p-4 rounded-md overflow-x-auto">
                      <code className="text-sm">
                        <pre>
                          {`// Example of a React component
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4 border rounded-md">
      <p className="mb-2">Count: {count}</p>
      <button 
        className="bg-primary text-white px-3 py-1 rounded-md mr-2"
        onClick={() => setCount(count + 1)}
      >
        Increment
      </button>
      <button 
        className="bg-secondary text-white px-3 py-1 rounded-md"
        onClick={() => setCount(0)}
      >
        Reset
      </button>
    </div>
  );
}

export default Counter;`}
                        </pre>
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}

