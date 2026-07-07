// Scattered blurred sparkles/swirls/clouds used behind page content for the
// CharmOS mesh-gradient aesthetic. Purely decorative — non-interactive.

interface Shape {
  kind: 'diamond' | 'swirl' | 'cloud'
  top?: string
  left?: string
  right?: string
  bottom?: string
  size: number
  color: string
  opacity: number
  blur: number
  rotate?: number
}

const DEFAULT_SHAPES: Array<Shape> = [
  { kind: 'diamond', top: '4%', left: '6%', size: 90, color: 'var(--charm-lavender-deep)', opacity: 0.35, blur: 1, rotate: -8 },
  { kind: 'diamond', top: '58%', right: '4%', size: 120, color: 'var(--charm-pink-deep)', opacity: 0.3, blur: 1, rotate: 12 },
  { kind: 'swirl', top: '20%', right: '18%', size: 140, color: 'var(--charm-blue-deep)', opacity: 0.28, blur: 0 },
  { kind: 'swirl', bottom: '8%', left: '12%', size: 110, color: 'var(--charm-lavender-deep)', opacity: 0.24, blur: 0 },
  { kind: 'cloud', top: '38%', left: '2%', size: 160, color: 'var(--charm-blue)', opacity: 0.4, blur: 2 },
  { kind: 'cloud', bottom: '18%', right: '8%', size: 190, color: 'var(--charm-pink)', opacity: 0.38, blur: 2 },
]

function DiamondShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <path
        d="M50 0 C54 34 66 46 100 50 C66 54 54 66 50 100 C46 66 34 54 0 50 C34 46 46 34 50 0 Z"
        fill={color}
      />
    </svg>
  )
}

function SwirlShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <path
        d="M50 12c21 0 38 17 38 38S71 88 50 88 20 74 20 55c0-13 10-23 23-23s21 9 21 21-8 18-18 18"
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export function CloudShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 160 96" fill="none">
      <path
        d="M40 76c-16 0-28-11-28-25 0-13 10-23 23-25 3-14 16-24 31-24 14 0 26 9 30 22 15 1 27 13 27 27 0 15-13 25-29 25H40Z"
        fill={color}
      />
    </svg>
  )
}

function renderShape(shape: Shape) {
  switch (shape.kind) {
    case 'diamond':
      return <DiamondShape size={shape.size} color={shape.color} />
    case 'swirl':
      return <SwirlShape size={shape.size} color={shape.color} />
    case 'cloud':
      return <CloudShape size={shape.size} color={shape.color} />
  }
}

export function DecorativeShapes({ shapes = DEFAULT_SHAPES }: { shapes?: Array<Shape> }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {shapes.map((shape, i) => (
        <div
          key={i}
          className="charm-blob"
          style={{
            top: shape.top,
            left: shape.left,
            right: shape.right,
            bottom: shape.bottom,
            opacity: shape.opacity,
            filter: `blur(${shape.blur}px)`,
            transform: shape.rotate ? `rotate(${shape.rotate}deg)` : undefined,
          }}
        >
          {renderShape(shape)}
        </div>
      ))}
    </div>
  )
}
