import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";

export function CartLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="relative h-16 w-48 overflow-hidden">
        {/* ground line */}
        <div className="absolute bottom-2 left-0 right-0 h-px bg-border" />
        {/* rolling cart */}
        <motion.div
          className="absolute bottom-2 text-primary"
          initial={{ x: -40 }}
          animate={{ x: 200 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            animate={{ rotate: [0, -4, 0, 4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            <ShoppingCart className="h-8 w-8" />
          </motion.div>
        </motion.div>
        {/* falling items */}
        {[0, 0.4, 0.8].map((delay, i) => (
          <motion.div
            key={i}
            className="absolute top-0 h-2 w-2 rounded-full gradient-primary"
            style={{ left: `${30 + i * 40}px` }}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 40, opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, delay, ease: "easeIn" }}
          />
        ))}
      </div>
      <motion.p
        className="text-sm text-muted-foreground"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {label}
      </motion.p>
    </div>
  );
}
