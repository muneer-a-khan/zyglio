'use client'

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, Mic, Play } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      icon: <Plus className="h-5 w-5" />,
      label: "New Procedure",
      href: "/create",
      color: "bg-blue-600 hover:bg-blue-700"
    },
    {
      icon: <Mic className="h-5 w-5" />,
      label: "Voice Demo",
      href: "/demo",
      color: "bg-green-600 hover:bg-green-700"
    },
    {
      icon: <Play className="h-5 w-5" />,
      label: "Live Demo",
      href: "/demo",
      color: "bg-purple-600 hover:bg-purple-700"
    }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <motion.div
        className="flex flex-col items-end space-y-4"
        initial={false}
        animate={isOpen ? "open" : "closed"}
      >
        {/* Action Buttons */}
        {isOpen && (
          <>
            {actions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0, y: 20 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-3"
              >
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.1 }}
                  className="bg-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium text-gray-700 whitespace-nowrap"
                >
                  {action.label}
                </motion.div>
                <Button
                  asChild
                  size="sm"
                  className={`${action.color} text-white rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-xl transition-all duration-200`}
                >
                  <Link href={action.href}>
                    {action.icon}
                  </Link>
                </Button>
              </motion.div>
            ))}
          </>
        )}

        {/* Main FAB */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Button
            onClick={() => setIsOpen(!isOpen)}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 p-0 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <motion.div
              animate={{ rotate: isOpen ? 45 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <Plus className="h-6 w-6" />
            </motion.div>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
} 