'use client'

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for individuals getting started",
    features: [
      "Up to 5 procedures",
      "Basic voice recording",
      "Standard templates",
      "Email support",
      "1GB storage"
    ],
    cta: "Get Started",
    href: "/auth/register",
    popular: false,
    color: "border-gray-200"
  },
  {
    name: "Professional",
    price: "$29",
    period: "/month",
    description: "Ideal for teams and growing organizations",
    features: [
      "Unlimited procedures",
      "Advanced voice AI",
      "Custom templates",
      "Priority support",
      "10GB storage",
      "Team collaboration",
      "Analytics dashboard",
      "API access"
    ],
    cta: "Start Free Trial",
    href: "/auth/register",
    popular: true,
    color: "border-blue-500"
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations with specific needs",
    features: [
      "Everything in Professional",
      "Custom integrations",
      "Dedicated support",
      "Unlimited storage",
      "Advanced security",
      "Custom branding",
      "On-premise deployment",
      "SLA guarantee"
    ],
    cta: "Contact Sales",
    href: "/contact",
    popular: false,
    color: "border-gray-200"
  }
];

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function PricingSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container px-4 mx-auto max-w-7xl">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the plan that's right for you. Start free and upgrade as you grow.
          </p>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              variants={fadeInUp}
              className={`relative bg-white rounded-2xl border-2 ${plan.color} p-8 shadow-sm hover:shadow-lg transition-all duration-300 ${
                plan.popular ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                    <Star className="h-4 w-4 mr-1 fill-current" />
                    Most Popular
                  </div>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-gray-600 ml-1">
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className="text-gray-600">
                  {plan.description}
                </p>
              </div>
              
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button
                asChild
                className={`w-full ${
                  plan.popular 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
              >
                <Link href={plan.href}>
                  {plan.cta}
                </Link>
              </Button>
            </motion.div>
          ))}
        </motion.div>
        
        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-gray-600 mb-4">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <p className="text-sm text-gray-500">
            Need a custom plan? <Link href="/contact" className="text-blue-600 hover:text-blue-700 font-medium">Contact our sales team</Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
} 