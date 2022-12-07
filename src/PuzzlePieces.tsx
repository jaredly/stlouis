import * as React from 'react';
import { PathKit } from 'pathkit-wasm';
import { BBox, bboxIntersect, compileSvg } from './Compile';
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
        return compileSvg(svg.current!, PathKit, 0);
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
    const [selection, setSelection] = React.useState(
        null as null | Array<number>,
    );
    const currentSel = React.useRef(selection);
    currentSel.current = selection;
    const [moving, setMoving] = useDrag(
        (moving) => {
            if (!moving.moved) {
                setSelection(null);
                return;
            }
            if (moving.extra === 'select-move') {
                setPositions((pos) => {
                    const r = { ...pos };
                    currentSel.current!.forEach((i) => {
                        const key = `piece-${i}`;
                        if (!r[key]) {
                            const x =
                                (pieces[i].bbox!.x1 + pieces[i].bbox!.x0) / 2;
                            const y =
                                (pieces[i].bbox!.y1 + pieces[i].bbox!.y0) / 2;
                            let cx = x * 1.2;
                            let cy = y * 1.2;
                            if (cx > width) cx -= width;
                            if (cy > height) cy -= height;
                            r[key] = { x: cx, y: cy, rotate: 0 };
                        }
                        const dx = moving.origin.x - moving.pos.x;
                        const dy = moving.origin.y - moving.pos.y;
                        r[key].x -= dx;
                        r[key].y -= dy;
                    });
                    return r;
                });
            } else if (moving.extra === 'select') {
                const bbox: BBox = {
                    x0: Math.min(moving.origin.x, moving.pos.x),
                    y0: Math.min(moving.origin.y, moving.pos.y),
                    x1: Math.max(moving.origin.x, moving.pos.x),
                    y1: Math.max(moving.origin.y, moving.pos.y),
                };
                setSelection(
                    pieces
                        .map((piece, i) => {
                            const key = `piece-${i}`;
                            const x = (piece.bbox!.x1 + piece.bbox!.x0) / 2;
                            const y = (piece.bbox!.y1 + piece.bbox!.y0) / 2;
                            let cx = x * 1.2;
                            let cy = y * 1.2;
                            if (cx > width) cx -= width;
                            if (cy > height) cy -= height;
                            const pos = positions[key] ?? { x: cx, y: cy };

                            return bboxIntersect(bbox, {
                                x0: pos.x - 10,
                                x1: pos.x + 10,
                                y0: pos.y - 10,
                                y1: pos.y + 10,
                            })
                                ? i
                                : null;
                        })
                        .filter((x) => x != null) as Array<number>,
                );
                return;
            } else {
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
            }
        },
        backPos,
        5,
    );
    const scale = 1 / 1.5;
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <div>
                <Download name={`puzzle.svg`} svg={psvg} />
            </div>
            <svg
                ref={psvg}
                style={{ outline: '1px solid magenta' }}
                width={width * scale + 'mm'}
                height={height * scale + 'mm'}
                viewBox={`0 0 ${width} ${height}`}
                xmlns="http://www.w3.org/2000/svg"
                onMouseDown={(evt) => {
                    const pos = backPos(evt);
                    setMoving({
                        origin: pos,
                        pos,
                        key: `select`,
                        moved: false,
                        extra: 'select',
                    });
                }}
            >
                {moving?.extra === 'select' ? (
                    <rect
                        x={Math.min(moving.pos.x, moving.origin.x)}
                        y={Math.min(moving.pos.y, moving.origin.y)}
                        width={Math.abs(moving.pos.x - moving.origin.x)}
                        height={Math.abs(moving.pos.y - moving.origin.y)}
                    />
                ) : null}
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
                <rect
                    x={0}
                    y={0}
                    width={320 / scale}
                    height={200 / scale}
                    fill="none"
                    stroke="black"
                    strokeWidth={1}
                />
                <rect
                    x={0}
                    y={200 / scale + 10}
                    width={320 / scale}
                    height={200 / scale}
                    fill="none"
                    stroke="black"
                    strokeWidth={2}
                />
                <rect
                    x={0}
                    y={400 / scale + 20}
                    width={320 / scale}
                    height={200 / scale}
                    fill="none"
                    stroke="black"
                    strokeWidth={2}
                />
                {pieces.map((piece, i) => {
                    const key = `piece-${i}`;
                    const x = (piece.bbox!.x1 + piece.bbox!.x0) / 2;
                    const y = (piece.bbox!.y1 + piece.bbox!.y0) / 2;
                    let cx = x * 1.2;
                    let cy = y * 1.2;
                    if (cx > width) cx -= width;
                    if (cy > height) cy -= height;

                    let pos =
                        moving?.key === key && !moving.extra && moving.moved
                            ? moving.pos
                            : positions[key] ?? { x: cx, y: cy };

                    if (
                        moving?.extra === 'select-move' &&
                        selection?.includes(i)
                    ) {
                        pos = { ...pos };
                        pos.x -= moving.origin.x - moving.pos.x;
                        pos.y -= moving.origin.y - moving.pos.y;
                    }

                    const rotate =
                        moving?.extra === 'rotate' &&
                        moving?.key === key &&
                        moving.moved
                            ? angleTo(moving.origin, moving.pos)
                            : positions[key]?.rotate ?? 0;

                    return (
                        <g
                            transform={`translate(${pos.x},${pos.y})`}
                            key={i}
                            data-piece={i}
                            onMouseDown={(evt) => {
                                if (evt.button !== 0) {
                                    return;
                                }
                                evt.stopPropagation();
                                const pos = backPos(evt);
                                if (selection?.length) {
                                    setMoving({
                                        origin: pos,
                                        pos,
                                        key: `select-move`,
                                        moved: false,
                                        extra: `select-move`,
                                    });
                                } else {
                                    setMoving({
                                        origin: pos,
                                        pos,
                                        key: `piece-${i}`,
                                        moved: false,
                                        extra: evt.shiftKey
                                            ? 'rotate'
                                            : undefined,
                                    });
                                }
                            }}
                        >
                            <g
                                transform={` rotate(${
                                    (rotate / Math.PI) * 180
                                }) `}
                            >
                                <path
                                    d={piece.path}
                                    fill={
                                        selection?.includes(i) ? 'red' : 'white'
                                    }
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
                                            (
                                                {
                                                    path,
                                                    color,
                                                    stroke,
                                                    transforms,
                                                },
                                                j,
                                            ) => (
                                                <path
                                                    key={j}
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
