"use client";
import React from "react";

import Header from "@/components/Header";
import "../styles/globals.css";
import Content from "@/components/Content";

export default function HomePage() {
  return (
    <div className="h-full">
      <div className="h-[10vh]">
        <Header />
      </div>
      <div className="h-[90vh]">
        <Content />
      </div>
    </div>
  );
}
