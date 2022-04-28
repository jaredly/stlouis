import * as React from 'react';
import { PathKit } from 'pathkit-wasm';
import { bboxIntersect, compileSvg } from './Compile';
import { Matrix } from './transforms';

export const PuzzlePieces = ({
    svg,
    PathKit,
}: {
    svg: React.MutableRefObject<SVGSVGElement | null>;
    PathKit: PathKit;
}) => {
    const { paths, pieces } = React.useMemo(() => {
        return compileSvg(svg.current!, PathKit);
    }, []);
    console.log(pieces[1].bbox);
    console.log(paths.slice(10));
    return (
        <div>
            <svg
                width={svg.current!.getAttribute('width')!}
                height={svg.current!.getAttribute('height')!}
                viewBox={svg.current!.getAttribute('viewBox')!}
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
                    const cx = (piece.bbox!.x1 + piece.bbox!.x0) / 2;
                    const cy = (piece.bbox!.y1 + piece.bbox!.y0) / 2;
                    return (
                        <g
                            transform={`translate(${cx / 10},${cy / 10})`}
                            clipPath={`url(#piece-${i})`}
                            key={i}
                        >
                            {paths
                                .filter((path) =>
                                    bboxIntersect(path.bbox!, piece.bbox!),
                                )
                                .map(({ path, color, stroke, transforms }) => (
                                    <path
                                        d={path}
                                        fill={stroke != null ? 'none' : color}
                                        stroke={stroke == null ? 'none' : color}
                                        strokeWidth={stroke}
                                        transform={transforms
                                            .map(matrixAttr)
                                            .join(' ')}
                                    />
                                ))}
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
