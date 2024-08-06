"use client";
import React, { useEffect, useState } from "react";

import Header from "@/components/Header";
import "../styles/globals.css";
import Content from "@/components/Content";
import Footer from "@/components/Footer";

export default function HomePage() {
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  return (
    <div className="h-full divide-y divide-gray-300">
      <div className="h-[3rem]">
        <Header setSerchKeyword={setSearchKeyword} />
      </div>
      <div className="h-[calc(100vh-5rem)]">
        <Content searchKeyword={searchKeyword} />
      </div>
      <div className="h-[2rem]">
        <Footer />
      </div>
    </div>
  );
}
