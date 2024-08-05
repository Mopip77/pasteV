import React from "react";
import { Input } from "./ui/input";

const Header = () => {
  return (
    <div className="fixed w-full h-12">
      <Input className="h-full" placeholder="Input to search..." />
    </div>
  );
};

export default Header;
