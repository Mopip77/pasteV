import { SearchBody } from "@/types/types";
import React, { Dispatch } from "react";
import Header from "./Header";
import Footer from "./Footer";
import Content from "./Content";

export const SearchBodyContext = React.createContext<{
  searchBody: SearchBody;
  setSearchBody: Dispatch<React.SetStateAction<SearchBody>>;
}>(null);

interface StatsContextType {
  totalItems: number;
  currentItems: number;
  selectedIndex: number;
  setTotalItems: (total: number) => void;
  setCurrentItems: (current: number) => void;
  setSelectedIndex: (index: number) => void;
}

export const StatsContext = React.createContext<StatsContextType>({
  totalItems: 0,
  currentItems: 0,
  selectedIndex: -1,
  setTotalItems: () => {},
  setCurrentItems: () => {},
  setSelectedIndex: () => {},
});

const ClipboardHistory = () => {
  const [searchBody, setSearchBody] = React.useState<SearchBody>({
    keyword: "",
    regex: false,
    type: "",
    semantic: false,
  });

  const [totalItems, setTotalItems] = React.useState(0);
  const [currentItems, setCurrentItems] = React.useState(0);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);

  return (
    <SearchBodyContext.Provider value={{ searchBody, setSearchBody }}>
      <StatsContext.Provider
        value={{
          totalItems,
          currentItems,
          selectedIndex,
          setTotalItems,
          setCurrentItems,
          setSelectedIndex,
        }}
      >
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
      </StatsContext.Provider>
    </SearchBodyContext.Provider>
  );
};

export default ClipboardHistory;
