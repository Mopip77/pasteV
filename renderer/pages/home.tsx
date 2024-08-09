"use client";
import React, { useState } from "react";

import Header from "@/components/Header";
import Content from "@/components/Content";
import Footer from "@/components/Footer";
import { SearchBody } from "@/types/types";

export default function HomePage() {
  const [searchBody, setSearchBody] = useState<SearchBody>({
    keyword: "",
  });

  return (
    <div className="h-full divide-y divide-gray-300">
      <div className="h-[3rem]">
        <Header setSearchBody={setSearchBody} />
      </div>
      <div className="h-[calc(100vh-5rem)]">
        <Content searchBody={searchBody} />
      </div>
      <div className="h-[2rem]">
        <Footer className="electron-draggable" />
      </div>
    </div>
  );
}
