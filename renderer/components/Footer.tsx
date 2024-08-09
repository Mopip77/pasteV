import { cn } from "@/lib/utils";
import React from "react";

const Footer = ({ className = "" }) => {
  return <div className={cn("fixed w-full", className)}>Footer</div>;
};

export default Footer;
