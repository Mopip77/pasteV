import React from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";

import "../styles/globals.css";

export default function HomePage() {
  const [message, setMessage] = React.useState({});

  React.useEffect(() => {
    window.ipc.on("message", (message) => {
      setMessage(message);
    });
  }, []);

  return (
    <React.Fragment>
      <Head>
        <title>Home - Nextron (basic-lang-javascript)</title>
      </Head>
      <div>
        <p>
          ⚡ Electron + Next.js ⚡ - <Link href="/next">Go to next page</Link>
        </p>
        <Image
          src="/images/logo.png"
          alt="Logo image"
          width={256}
          height={256}
        />
      </div>
      <div>
        <button
          onClick={() => {
            window.ipc.send("message");
          }}
        >
          Test IPC
        </button>
        <div>
          <div className="flex gap-9 border-b-2 border-b-gray-500">
            <div>{message.type}</div>
            <div>{message.data}</div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
