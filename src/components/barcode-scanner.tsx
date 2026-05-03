import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export function BarcodeScanner({ onResult }: { onResult: (code: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const id = "barcode-region";
    ref.current.id = id;
    const scanner = new Html5Qrcode(id);
    scannerRef.current = scanner;
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (decoded) => {
        onResult(decoded);
        scanner.stop().catch(() => {});
      },
      () => {},
    ).catch((e) => console.error("Scanner error", e));
    return () => {
      scanner.stop().catch(() => {});
      scanner.clear();
    };
  }, [onResult]);

  return <div ref={ref} className="w-full aspect-square rounded-lg overflow-hidden bg-black" />;
}
