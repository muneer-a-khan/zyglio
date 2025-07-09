"use client";

import React from 'react';
import { MapPin, Phone, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#063970] text-white pt-12 pb-6 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Laborde Products */}
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Laborde Products</h3>
                <p className="text-sm font-medium text-blue-200">Premier Marine Engine Distributor</p>
              </div>
            </div>
            <p className="text-sm text-white max-w-xs font-medium">
              Serving the Gulf Coast, Southeast US, and East Coast regions with over 20 years of marine engine expertise and 24/7 technical support.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-blue-200 text-sm font-semibold">24/7 Technical Support Available</span>
            </div>
          </div>

          {/* Service Locations */}
          <div>
            <h4 className="text-lg font-bold mb-3">Service Locations</h4>
            <div className="flex flex-col gap-2 text-white/90">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-blue-300 mt-0.5" />
                <div>
                  <span className="font-bold">Headquarters</span><br />
                  <span className="text-sm">Covington, Louisiana</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-blue-300 mt-0.5" />
                <div>
                  <span className="font-bold">Texas Location</span><br />
                  <span className="text-sm">Deer Park, Texas</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-blue-300 mt-0.5" />
                <div>
                  <span className="font-bold">Kentucky Location</span><br />
                  <span className="text-sm">Paducah, Kentucky</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info & Brands */}
          <div>
            <h4 className="text-lg font-bold mb-3">Contact Info</h4>
            <div className="flex items-center gap-2 mb-1">
              <Phone className="h-5 w-5 text-blue-300" />
              <span className="font-semibold">1-800-LABORDE</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Mail className="h-5 w-5 text-blue-300" />
              <span className="font-semibold">support@laborde.com</span>
            </div>
            <div className="mt-2">
              <span className="font-bold">Engine Brands</span>
              <ul className="text-sm text-white/90 mt-1 space-y-1">
                <li>• Mitsubishi Marine Engines</li>
                <li>• Scania Marine Engines</li>
                <li>• Steyr Motors</li>
                <li>• Yanmar Marine Engines</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-blue-800 mt-10 pt-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4 text-xs text-blue-200">
          <div>
            © 2024 Laborde Products. All rights reserved.
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-200">● Voice Ready</span>
            <span className="mx-1">|</span>
            <span>Powered by Zyglio, Inc.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}; 