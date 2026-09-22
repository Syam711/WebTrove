// The textured paper behind everything.
// Three quiet layers: fine grain, a tiled pattern of tiny marks, and a few
// typographic glyphs — some fixed in place, some drifting very slowly.

const svgUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`

const GRAIN = svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>
<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/>
<feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.1 -.15'/></filter>
<rect width='100%' height='100%' filter='url(#n)'/></svg>`)

const MARKS = svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='168' height='168' viewBox='0 0 168 168'
fill='none' stroke='black' stroke-width='1.1' stroke-linecap='round'>
<path d='M24 30h8M28 26v8'/><circle cx='112' cy='22' r='1.3' fill='black'/>
<circle cx='66' cy='74' r='3'/><path d='M134 100l6 6M140 100l-6 6'/>
<path d='M26 124q4-5 8 0t8 0'/><circle cx='98' cy='142' r='1.2' fill='black'/>
<path d='M72 118h6'/><path d='M150 44l4 4-4 4'/><circle cx='38' cy='78' r='1' fill='black'/>
</svg>`)

// x/y in %, size in px, o = opacity, dx/dy = how far it wanders, dur in s.
// `still` glyphs never move.
const GLYPHS = [
  { c: '#',  x: 6,  y: 12, s: 64, o: 0.07, still: true,  r: -8 },
  { c: '¶',  x: 88, y: 9,  s: 54, o: 0.07, dx: 26, dy: 34,  dur: 70, r: 6,  r1: 14 },
  { c: '§',  x: 14, y: 68, s: 48, o: 0.08, dx: -22, dy: -30, dur: 84, r: -4, r1: 6 },
  { c: '↗',  x: 78, y: 62, s: 58, o: 0.06, still: true,  r: 0 },
  { c: '[ ]', x: 46, y: 6,  s: 36, o: 0.08, dx: 30, dy: 18,  dur: 66, r: 0,  r1: -6 },
  { c: '@',  x: 93, y: 78, s: 42, o: 0.07, dx: -34, dy: -20, dur: 92, r: 10, r1: 0 },
  { c: '~',  x: 32, y: 88, s: 56, o: 0.07, dx: 40, dy: -12, dur: 78, r: 0,  r1: 8 },
  { c: '*',  x: 60, y: 92, s: 40, o: 0.08, still: true,  r: 0 },
  { c: '/',  x: 4,  y: 40, s: 60, o: 0.06, dx: 18, dy: 36,  dur: 88, r: 12, r1: 4 },
  { c: '†',  x: 70, y: 28, s: 34, o: 0.08, dx: -24, dy: 28, dur: 74, r: 0,  r1: -10 },
  { c: '›',  x: 24, y: 30, s: 44, o: 0.06, dx: 20, dy: -26, dur: 96, r: 0,  r1: 0 },
  { c: '&',  x: 52, y: 52, s: 52, o: 0.045, still: true, r: 6 },
  { c: '%',  x: 84, y: 38, s: 36, o: 0.07, dx: -18, dy: 22, dur: 68, r: -6, r1: 4 },
  { c: '⁂',  x: 40, y: 72, s: 30, o: 0.08, dx: 26, dy: -18, dur: 82, r: 0,  r1: 12 },
]

const mask = (image, size) => ({
  WebkitMaskImage: image,
  maskImage: image,
  WebkitMaskSize: size,
  maskSize: size,
})

export default function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop-layer" style={{ ...mask(GRAIN, '180px 180px'), opacity: 0.05 }} />
      <div className="backdrop-layer" style={{ ...mask(MARKS, '168px 168px'), opacity: 0.075 }} />
      {GLYPHS.map((g, i) => (
        <span
          key={i}
          className={`glyph${g.still ? '' : ' drifts'}`}
          style={{
            left: `${g.x}%`,
            top: `${g.y}%`,
            fontSize: g.s,
            '--o': g.o,
            '--r0': `${g.r ?? 0}deg`,
            '--r1': `${g.r1 ?? g.r ?? 0}deg`,
            '--dx': `${g.dx ?? 0}px`,
            '--dy': `${g.dy ?? 0}px`,
            '--dur': `${g.dur ?? 80}s`,
            '--delay': `${-(i * 9)}s`,
          }}
        >
          {g.c}
        </span>
      ))}
    </div>
  )
}
