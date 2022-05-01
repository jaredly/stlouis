import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';

const calcGrid = ({
    iw,
    ih,
    wn,
    hn,
    x: x0,
    y: y0,
}: {
    iw: number;
    ih: number;
    wn: number;
    hn: number;
    x: number;
    y: number;
}) => {
    const result: JSX.Element[] = [];
    for (let x = 0; x < wn; x++) {
        for (let y = 0; y < hn; y++) {
            if (x % 2 == y % 2) {
                continue;
            }
            result.push(
                <rect
                    key={`${x0}:${y0}:${x}:${y}`}
                    x={x * iw + x0}
                    y={y * ih + y0}
                    width={iw}
                    height={ih}
                    fill="black"
                />,
            );
        }
    }
    return result;
};

export const GridDemo = () => {
    const ref = React.useRef(null as null | SVGSVGElement);
    const width = 20;
    const grids = [
        ...calcGrid({ iw: 0.1, ih: 0.1, wn: 30, hn: 30, x: 0, y: 0 }),
        // 0.1s
        ...calcGrid({ iw: 0.4, ih: 0.1, wn: 7, hn: 30, x: 3.2, y: 0 }),
        ...calcGrid({ iw: 0.1, ih: 0.4, wn: 30, hn: 7, x: 0, y: 3.2 }),
        ...calcGrid({ iw: 0.2, ih: 0.2, wn: 14, hn: 14, x: 3.2, y: 3.2 }),
        // 0.2s
        ...calcGrid({ iw: 0.8, ih: 0.2, wn: 3, hn: 31, x: 6.4, y: 0 }),
        ...calcGrid({ iw: 0.2, ih: 0.8, wn: 31, hn: 3, x: 0, y: 6.4 }),
        ...calcGrid({ iw: 0.4, ih: 0.4, wn: 6, hn: 6, x: 6.4, y: 6.4 }),
        // 0.4s
        ...calcGrid({ iw: 1.6, ih: 0.4, wn: 5, hn: 10, x: 0, y: 9.0 }),
        ...calcGrid({ iw: 0.4, ih: 1.6, wn: 10, hn: 5, x: 9.0, y: 0 }),
        ...calcGrid({ iw: 0.8, ih: 0.8, wn: 6, hn: 6, x: 8.3, y: 8.3 }),
        // 0.8s
        ...calcGrid({ iw: 1.6, ih: 0.8, wn: 8, hn: 7, x: 0, y: 13.4 }),
        ...calcGrid({ iw: 0.8, ih: 1.6, wn: 7, hn: 8, x: 13.4, y: 0 }),
        ...calcGrid({ iw: 1.6, ih: 1.6, wn: 4, hn: 4, x: 13.0, y: 13.0 }),
    ];
    // const n = 30;
    // const size = 0.1;
    // for (let x = 0; x < n; x++) {
    //     for (let y = 0; y < n; y++) {
    //         if (x % 2 == y % 2) {
    //             continue;
    //         }
    //         grids.push(
    //             <rect
    //                 key={`${x}:${y}`}
    //                 x={x * size}
    //                 y={y * size}
    //                 width={size}
    //                 height={size}
    //                 fill="black"
    //             />,
    //         );
    //     }
    // }
    return (
        <div>
            <svg
                width={width + 'mm'}
                height={width + 'mm'}
                style={{ outline: '1px solid magenta' }}
                viewBox={`${0} ${0} ${width} ${width}`}
                xmlns={'http://www.w3.org/2000/svg'}
                ref={(n) => {
                    ref.current = n;
                }}
            >
                {grids}
            </svg>
        </div>
    );
};

export const gridDemo = (root: Root) => {
    root.render(<GridDemo />);
};
