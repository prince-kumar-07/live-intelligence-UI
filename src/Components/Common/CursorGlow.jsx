import { useEffect, useRef } from "react";

function CursorGlow() {
  const glowRef = useRef(null);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const frame = useRef(null);
  const active = useRef(false);

  useEffect(() => {
    const node = glowRef.current;
    if (!node) return;

    const handleMove = (e) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      if (!active.current) {
        active.current = true;
        pos.current.x = e.clientX;
        pos.current.y = e.clientY;
        node.classList.add("is-active");
      }
    };

    const animate = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.09;
      pos.current.y += (target.current.y - pos.current.y) * 0.09;
      node.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      frame.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMove);
    frame.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  return <div className="cursor-glow" ref={glowRef} aria-hidden="true" />;
}

export default CursorGlow;
