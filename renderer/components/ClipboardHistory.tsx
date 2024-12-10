import { SearchBody } from "@/types/types";
import React, { Dispatch } from "react";
import Header from "./Header";
import Footer from "./Footer";
import Content from "./Content";

export const SearchBodyContext = React.createContext<{
  searchBody: SearchBody;
  setSearchBody: Dispatch<React.SetStateAction<SearchBody>>;
}>(null);

const ClipboardHistory = () => {
  const [searchBody, setSearchBody] = React.useState<SearchBody>({
    keyword: "",
    regex: false,
    type: "",
    tags: [],
  });

  return (
    <SearchBodyContext.Provider value={{ searchBody, setSearchBody }}>
      <div className="h-full divide-y divide-gray-300">
        <div className="h-[3rem]">
          <Header />
        </div>
        <div className="h-[calc(100vh-5rem)]">
          <Content />
        </div>
        <div className="h-[2rem]">
          <Footer className="electron-draggable" />
        </div>
      </div>
    </SearchBodyContext.Provider>
  );
};

export default ClipboardHistory;
