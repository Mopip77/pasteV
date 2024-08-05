"use client";
import React from "react";

import Header from "@/components/Header";
import "../styles/globals.css";
import Content from "@/components/Content";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="h-full divide-y divide-gray-300">
      <div className="h-[3rem]">
        <Header />
      </div>
      <div className="h-[calc(100vh-5rem)]">
        <Content />
      </div>
      <div className="h-[2rem]">
        <Footer />
      </div>
    </div>
  );
}
