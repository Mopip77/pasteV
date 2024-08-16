import React, { useEffect } from "react";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";

import "../styles/globals.css";
import { Provider } from "react-redux";
import store from "@/stores/store";

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        window.ipc.send("app:hide", undefined);
      }
      if (e.key === "," && e.metaKey) {
        // 路由到设置页面
        router.push("/settings");
      }
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [router]);

  return (
    <Provider store={store}>
      <Component {...pageProps} />
    </Provider>
  );
}

export default MyApp;
