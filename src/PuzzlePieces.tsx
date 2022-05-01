import * as React from 'react';
import { PathKit } from 'pathkit-wasm';
import { bboxIntersect, compileSvg } from './Compile';
import { Matrix } from './transforms';
import { useDrag } from './useDrag';
import { useLocalStorage } from './App';
import { angleTo } from './ShowNames';
import { Download } from './Export';

const empty: { [key: string]: { x: number; y: number; rotate: number } } = {};

export const PuzzlePieces = ({
    svg,
    PathKit,
    width,
    height,
}: {
    width: number;
    height: number;
    svg: React.MutableRefObject<SVGSVGElement | null>;
    PathKit: PathKit;
}) => {
    const { paths, pieces } = React.useMemo(() => {
        return compileSvg(svg.current!, PathKit, 0.1);
    }, []);
    const psvg = React.useRef(null as null | SVGSVGElement);
    const [positions, setPositions] = useLocalStorage(
        'puzzle-positions',
        empty,
    );
    const backPos = (evt: { clientX: number; clientY: number }) => {
        const box = psvg.current!.getBoundingClientRect();
        const pos = {
            x: ((evt.clientX - box.left) / box.width) * width,
            y: ((evt.clientY - box.top) / box.height) * height,
        };
        return pos;
    };
    const [moving, setMoving] = useDrag(
        (moving) => {
            if (!moving.moved) {
                return;
            }
            setPositions((pos) => {
                const r = { ...pos };
                if (moving.extra === 'rotate') {
                    r[moving.key] = {
                        ...moving.origin,
                        ...r[moving.key],
                        rotate: angleTo(moving.origin, moving.pos),
                    };
                } else {
                    r[moving.key] = { ...r[moving.key], ...moving.pos };
                }
                return r;
            });
        },
        backPos,
        5,
    );
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Download name={`puzzle.svg`} svg={psvg} />
            <svg
                ref={psvg}
                style={{ outline: '1px solid magenta' }}
                width={width / 1.5 + 'mm'}
                height={height / 1.5 + 'mm'}
                viewBox={`0 0 ${width} ${height}`}
                xmlns="http://www.w3.org/2000/svg"
            >
                {pieces.map((piece, i) => (
                    <clipPath id={`piece-${i}`} key={i}>
                        <path
                            d={piece.path}
                            transform={piece.transforms
                                .map(matrixAttr)
                                .join(' ')}
                        />
                    </clipPath>
                ))}
                {pieces.map((piece, i) => {
                    const key = `piece-${i}`;
                    const x = (piece.bbox!.x1 + piece.bbox!.x0) / 2;
                    const y = (piece.bbox!.y1 + piece.bbox!.y0) / 2;
                    let cx = x * 1.2;
                    let cy = y * 1.2;
                    if (cx > width) cx -= width;
                    if (cy > height) cy -= height;

                    const pos =
                        moving?.key === key && !moving.extra && moving.moved
                            ? moving.pos
                            : positions[key];

                    const rotate =
                        moving?.extra === 'rotate' &&
                        moving?.key === key &&
                        moving.moved
                            ? angleTo(moving.origin, moving.pos)
                            : positions[key]?.rotate ?? 0;

                    return (
                        <g
                            transform={`translate(${pos ? pos.x : cx},${
                                pos ? pos.y : cy
                            })`}
                            key={i}
                            onMouseDown={(evt) => {
                                if (evt.button !== 0) {
                                    return;
                                }
                                setMoving({
                                    origin: backPos(evt),
                                    pos,
                                    key: `piece-${i}`,
                                    moved: false,
                                    extra: evt.shiftKey ? 'rotate' : undefined,
                                });
                            }}
                        >
                            <g
                                transform={` rotate(${
                                    (rotate / Math.PI) * 180
                                }) `}
                            >
                                <path
                                    d={piece.path}
                                    // fill="rgba(0,0,0,0.1)"
                                    fill="white"
                                    stroke="red"
                                    strokeWidth={1}
                                    transform={
                                        `translate(${-x},${-y}) ` +
                                        piece.transforms
                                            .map(matrixAttr)
                                            .join(' ')
                                    }
                                />
                                <g
                                    transform={`translate(${-x},${-y})`}
                                    clipPath={`url(#piece-${i})`}
                                >
                                    {paths
                                        .filter((path) =>
                                            bboxIntersect(
                                                path.bbox!,
                                                piece.bbox!,
                                            ),
                                        )
                                        .map(
                                            ({
                                                path,
                                                color,
                                                stroke,
                                                transforms,
                                            }) => (
                                                <path
                                                    d={path}
                                                    fill={
                                                        stroke != null
                                                            ? 'none'
                                                            : color
                                                    }
                                                    stroke={
                                                        stroke == null
                                                            ? 'none'
                                                            : color
                                                    }
                                                    strokeWidth={stroke}
                                                    transform={transforms
                                                        .map(matrixAttr)
                                                        .join(' ')}
                                                />
                                            ),
                                        )}
                                </g>
                            </g>
                        </g>
                    );
                })}
                {/* {paths
                .filter((path) =>
                    bboxIntersect(path.bbox!, pieces[0].bbox!),
                )
                .map(({ path, color, stroke, transforms }) => (
                    <path
                        d={path}
                        fill={stroke != null ? 'none' : color}
                        stroke={stroke == null ? 'none' : color}
                        strokeWidth={stroke}
                        transform={transforms.map(matrixAttr).join(' ')}
                    />
                ))} */}
            </svg>
        </div>
    );
};
const matrixAttr = ([[a, c, e], [b, d, f]]: Matrix) =>
    `matrix(${a} ${b} ${c} ${d} ${e} ${f})`;
