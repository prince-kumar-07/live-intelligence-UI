import { useMapContext } from "react-simple-maps";
import { useEffect, useRef } from "react";
import * as d3 from "d3";

function AttackArc({ attack }) {

  const { projection } = useMapContext();

  const pathRef = useRef(null);
  const particleRef = useRef(null);

  const start = projection(attack.from.coords);
  const end = projection(attack.to.coords);

  if (!start || !end) return null;

  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2 - 120;

  const path = d3.line().curve(d3.curveBasis)([
    start,
    [midX, midY],
    end
  ]);

  useEffect(() => {

    const pathEl = pathRef.current;
    const particle = particleRef.current;

    if (!pathEl || !particle) return;

    const length = pathEl.getTotalLength();

    /* Hide line initially */
    pathEl.style.strokeDasharray = length;
    pathEl.style.strokeDashoffset = length;
    pathEl.style.opacity = 0;

    pathEl.getBoundingClientRect();

    requestAnimationFrame(() => {

      pathEl.style.transition = "stroke-dashoffset 1.2s linear";
      pathEl.style.strokeDashoffset = "0";
      pathEl.style.opacity = 1;

      let progress = 0;

      const animateParticle = () => {

        progress += 4;

        if (progress > length) return;

        const point = pathEl.getPointAtLength(progress);

        particle.setAttribute("cx", point.x);
        particle.setAttribute("cy", point.y);

        requestAnimationFrame(animateParticle);
      };

      animateParticle();

    });

  }, []);

  return (
    <g>

     
      <path
        ref={pathRef}
        d={path}
        stroke={attack.type.color}
        strokeWidth="1.4"
        strokeOpacity="0.95"
        strokeLinecap="round"
        fill="none"
      />

     
      <circle
        ref={particleRef}
        r="2.5"
        fill={attack.type.color}
        style={{
          filter: "drop-shadow(0 0 4px " + attack.type.color + ")"
        }}
      />

    </g>
  );
}

export default AttackArc;