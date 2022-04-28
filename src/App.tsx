import * as React from 'react';
import {
    Feature,
    LineString,
    Polygon,
    MultiPolygon,
    Position,
    FeatureCollection,
    Point,
} from 'geojson';
import proj4 from 'proj4';
import { ShowNames } from './ShowNames';
import { ShowPlaces } from './ShowPlaces';
import opentype from 'opentype.js';
import { PathKit } from 'pathkit-wasm';
import { PuzzlePieces } from './PuzzlePieces';
import { calculateCenters } from './calculateCenters';

export const App = ({
    types,
    boundary,
    places,
    neighborhoods,
    font,
    headerFont,
    natural,
    PathKit,
}: {
    PathKit: PathKit;
    types: { [key: string]: Array<Feature<LineString>> };
    neighborhoods: FeatureCollection<Polygon | MultiPolygon>;
    waterways: FeatureCollection<LineString>;
    boundary: FeatureCollection;
    natural: FeatureCollection<Polygon>;
    places: { [key: string]: Array<Feature<Point>> };
    font: opentype.Font;
    headerFont: opentype.Font;
}) => {
    const [selp, setSelp] = React.useState(null as null | string);
    const [pos, setPos] = React.useState(null as null | Pos);
    const [mini, setMini] = React.useState(false);
    const bounds = React.useMemo(() => {
        if (mini && pos) {
            const size = 4900;
            return {
                x0: pos.x - size,
                y0: pos.y - size,
                x1: pos.x + size,
                y1: pos.y + size,
            };
        }
        let [x0, y0, x1, y1] = boundary.bbox!;
        // y1 = 1047986.8701159965;
        // y0 = 989536.881186489;
        // x1 = 911486.1515920038;
        return { x0, y0, x1, y1 };
    }, [boundary.bbox, mini ? pos : null]);

    const [selected, setSelected] = React.useState(null as null | Selected);

    const [detail, setDetail] = React.useState(false);

    const scaleDown = 3;

    const w = mini && pos ? 140 : 519;
    const dx = bounds.x1 - bounds.x0;
    const dy = bounds.y1 - bounds.y0;
    const h = (dy / dx) * w;
    const viewMargin = 10;

    const [rotate, setRotate] = React.useState(false);
    const rotW = rotate ? h : w;
    const rotH = rotate ? w : h;

    const fullWidth = (rotW + viewMargin * 2) / scaleDown;
    const fullHeight = (rotH + viewMargin * 2) / scaleDown;

    const backPos = (evt: { clientX: number; clientY: number }) => {
        // { x, y }: Pos) => {
        const b = ref.current!.getBoundingClientRect();
        let x = (evt.clientX - b.left) / b.width;
        let y = (evt.clientY - b.top) / b.height;
        x = (x * w - viewMargin) / w;
        y = ((1 - y) * h + viewMargin) / h;
        x = x * dx + bounds.x0;
        y = y * dy + bounds.y0;
        return { x, y };
    };

    const scalePos = ([x, y]: Position) => [
        ((x - bounds.x0) / dx) * (w + viewMargin * 2),
        (1 - (y - bounds.y0) / dy) * (h + viewMargin * 2),
    ];
    const inBounds = ([x, y]: Position) =>
        bounds.x0 <= x && x <= bounds.x1 && bounds.y0 <= y && y <= bounds.y1;
    const showPos = ([x, y]: Position) =>
        `${((x - bounds.x0) / dx) * w},${(1 - (y - bounds.y0) / dy) * h}`;

    const t = Object.keys(types)
        .sort((a, b) => (sizes[a] || 0) - (sizes[b] || 0))
        .filter((t) => !skip.includes(t));

    const centers = React.useMemo(() => {
        return calculateCenters(types);
    }, [types]);

    const ref = React.useRef(null as null | SVGSVGElement);

    const [url, setUrl] = React.useState(null as null | string);
    const posShow = pos ? scalePos([pos.x, pos.y]) : null;

    const [compile, setCompile] = React.useState(false);

    return (
        <div>
            <div style={{ padding: 24, outline: '1px solid magenta' }}>
                <button
                    onClick={() => {
                        setDetail(!detail);
                    }}
                >
                    {detail ? 'Hide Detail' : 'Show Detail'}
                </button>
                <button
                    onClick={() => {
                        setCompile(!compile);
                    }}
                >
                    {compile ? 'Hide Compile' : 'Compile'}
                </button>
                <button
                    onClick={() => {
                        setRotate(!rotate);
                    }}
                >
                    {rotate ? 'Rotate' : 'Straight'}
                </button>
                <button
                    onClick={() => {
                        setMini(!mini);
                    }}
                >
                    {mini ? 'Mini' : 'Full'}
                </button>
                <div>
                    {url ? (
                        <a
                            href={url}
                            download={`map-${mini ? 'mini' : 'full'}-${
                                rotate ? 'rotate' : 'straight'
                            }.svg`}
                            onClick={() => {
                                setTimeout(() => setUrl(null), 50);
                            }}
                        >
                            Download map.svg
                        </a>
                    ) : (
                        <button
                            onClick={() => {
                                let contents =
                                    ref.current!.outerHTML +
                                    `<!-- STATE\n` +
                                    JSON.stringify(localStorage) +
                                    '\n-->';
                                const blob = new Blob([contents], {
                                    type: 'image/svg+xml',
                                });
                                setUrl(URL.createObjectURL(blob));
                            }}
                        >
                            Download
                        </button>
                    )}
                    <span>
                        {pos ? `${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}` : ''}
                    </span>
                </div>
                {compile ? <PuzzlePieces svg={ref} PathKit={PathKit} /> : null}
                <svg
                    width={fullWidth + 'mm'}
                    height={fullHeight + 'mm'}
                    style={{ outline: '1px solid magenta' }}
                    viewBox={`${-viewMargin} ${-viewMargin} ${
                        rotW + viewMargin * 2
                    } ${rotH + viewMargin * 2}`}
                    xmlns={'http://www.w3.org/2000/svg'}
                    ref={(n) => {
                        ref.current = n;
                    }}
                    onClick={(evt) => {
                        setPos(backPos(evt));
                    }}
                >
                    <clipPath id="rect-clip">
                        {neighborhoods.features.map((feature, i) =>
                            feature.geometry.type === 'Polygon'
                                ? feature.geometry.coordinates.map((coord) => (
                                      <polygon
                                          points={coord.map(showPos).join(' ')}
                                          fill="black"
                                          key={i}
                                      />
                                  ))
                                : feature.geometry.coordinates.map((coord) =>
                                      coord.map((path, ii) => (
                                          <polygon
                                              points={path
                                                  .map(showPos)
                                                  .join(' ')}
                                              fill="black"
                                              key={i + ':' + ii}
                                          />
                                      )),
                                  ),
                        )}
                    </clipPath>
                    <rect
                        x={-10}
                        y={-10}
                        width={(rotate ? h : w) + 20}
                        height={(rotate ? w : h) + 20}
                        fill="none"
                        stroke="red"
                        strokeWidth={1}
                    />
                    <g
                        clipPath={detail ? 'url(#rect-clip)' : undefined}
                        transform={
                            rotate ? `rotate(-90) translate(${-w} 0)` : ''
                        }
                    >
                        {posShow && !mini && !detail ? (
                            <circle
                                cx={posShow[0]}
                                cy={posShow[1]}
                                r={5}
                                stroke="red"
                                fill="none"
                            />
                        ) : null}
                        <g>
                            {detail &&
                                natural.features.map((feat, i) => (
                                    <polygon
                                        key={i}
                                        points={feat.geometry.coordinates[0]
                                            .map(toStl.forward)
                                            .map(showPos)
                                            .join(' ')}
                                        fill={
                                            feat.properties!.type === 'water'
                                                ? '#222'
                                                : feat.properties!.type ===
                                                  'forest'
                                                ? '#666'
                                                : '#ddd'
                                        }
                                    />
                                ))}
                        </g>
                        <g>
                            {
                                //false &&
                                t.map(
                                    (k, ti) =>
                                        (detail || !roadColor[k]) &&
                                        types[k].map((shape, i) =>
                                            shape.geometry.coordinates
                                                .map(toStl.forward)
                                                .some(inBounds) ? (
                                                <polyline
                                                    fill="none"
                                                    key={ti + ':' + i}
                                                    data-type={k}
                                                    stroke={
                                                        selected?.type ===
                                                            'road' &&
                                                        selected.kind === k &&
                                                        selected.name ===
                                                            shape.properties!
                                                                .name
                                                            ? '#3f3'
                                                            : getColor(k)
                                                    }
                                                    strokeWidth={
                                                        sizes[k] || 0.5
                                                    }
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    points={justWithinBounds(
                                                        inBounds,
                                                        (
                                                            shape.geometry as LineString
                                                        ).coordinates.map(
                                                            toStl.forward,
                                                        ),
                                                    )
                                                        .map(showPos)
                                                        .join(' ')}
                                                />
                                            ) : null,
                                        ),
                                )
                            }
                        </g>
                        <g>
                            <ShowNames
                                font={font}
                                types={types}
                                scalePos={scalePos}
                                backPos={backPos}
                                inBounds={inBounds}
                                centers={centers}
                                selected={detail ? null : selected}
                                setSelected={setSelected}
                            />
                        </g>
                        <g>
                            <ShowPlaces
                                font={headerFont}
                                selp={selp}
                                places={neighborhoods}
                                scalePos={scalePos}
                                backPos={backPos}
                                inBounds={inBounds}
                                selected={detail ? null : selected}
                                setSelected={setSelected}
                            />
                        </g>
                        <g>
                            {neighborhoods.features.map((feature, i) => {
                                const isSelected =
                                    !detail &&
                                    selected?.type === 'place' &&
                                    (selected.name ===
                                        feature.properties!.NHD_NAME ||
                                        selected.name ===
                                            nbhNames[
                                                feature.properties!.NHD_NAME
                                            ]);

                                const color = isSelected ? 'green' : 'red';

                                return feature.geometry.type === 'Polygon' ? (
                                    <polygon
                                        data-name={feature.properties!.NHD_NAME}
                                        data-piece={
                                            feature.properties!.NHD_NAME
                                        }
                                        points={feature.geometry.coordinates[0]
                                            .map(showPos)
                                            .join(' ')}
                                        fill="none"
                                        strokeWidth={isSelected ? 3 : 1}
                                        stroke={color}
                                        key={i}
                                    />
                                ) : (
                                    feature.geometry.coordinates.map((coord) =>
                                        coord.map((path, ii) => (
                                            <polygon
                                                data-name={
                                                    feature.properties!.NHD_NAME
                                                }
                                                data-piece={
                                                    feature.properties!.NHD_NAME
                                                }
                                                points={path
                                                    .map(showPos)
                                                    .join(' ')}
                                                fill="none"
                                                strokeWidth={isSelected ? 3 : 1}
                                                stroke={
                                                    isSelected ? 'green' : 'red'
                                                }
                                                key={i + ':' + ii}
                                            />
                                        )),
                                    )
                                );
                            })}
                        </g>
                    </g>
                </svg>
            </div>
        </div>
    );
};
const stlProj =
    'PROJCS["NAD_1983_StatePlane_Missouri_East_FIPS_2401_Feet",GEOGCS["GCS_North_American_1983",DATUM["D_North_American_1983",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",820208.3333333333],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",-90.5],PARAMETER["Scale_Factor",0.9999333333333333],PARAMETER["Latitude_Of_Origin",35.83333333333334],UNIT["Foot_US",0.3048006096012192]]';
const roadsPrj =
    'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]';

export const toStl = proj4(roadsPrj, stlProj);
const fromStl = proj4(stlProj, roadsPrj);
export const dist = (a: Pos, b: Pos) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
};
// const toShow = [
//     'residential',
//     'primary',
//     'tertiary',
//     'secondary',
//     'motorway',
//     'trunk',
// ];

export type Pos = { x: number; y: number };
const sizes: { [key: string]: number } = {
    trunk: 2,
    motorway: 2,
    primary: 2,
    secondary: 2,
    tertiary: 1,
    residential: 0.5,
};

export const fontSizes: { [key: string]: number } = {
    trunk: 6,
    motorway: 5,
    primary: 4,
    secondary: 3,
};
export const labeled = ['trunk', 'motorway', 'primary', 'secondary'];
const colors: { [key: string]: string } = {
    // trunk: 'red',
    // motorway: 'red',
    // primary: '#f55',
    // secondary: '#faa',
    // tertiary: '#faa',
    // residential: '#fcc',
    trunk: '#111',
    motorway: '#333',
    primary: '#555',
    secondary: '#666',
    tertiary: '#777',
    residential: '#888',

    others: '#888',
};
const waterSize = {
    canal: 7,
    dam: 1,
    ditch: 2,
    dock: 1,
    drain: 1,
    river: 10,
    stream: 3,
    weir: 1,
};
const roadColor: { [key: string]: string } = {
    residential: '#888',
    others: '#888',
    unclassified: '#888',
    cycleway: '#888',
    service: '#bbb',
    track: '#bbb',
    construction: '#bbb',
};
const getColor = (type: string) => roadColor[type] || '#222';
const skip = [
    'footway',
    'pedestrian',
    'steps',
    'elevator',
    'living_street',
    'path',
];

export type Centers = {
    [name: string]: {
        center: {
            x: number;
            y: number;
        };
        totalLength: number;
        closest: [number, Feature<LineString>, Pos, Position, Position];
    };
};
const averagePoint = (pos: Position[]): Pos => {
    let cx = 0;
    let cy = 0;
    pos.forEach(([x, y]) => {
        cx += x;
        cy += y;
    });
    return { x: cx / pos.length, y: cy / pos.length };
};
const justWithinBounds = (
    inBounds: (pos: Position) => boolean,
    points: Position[],
) => {
    let start = 0;
    for (
        start = 0;
        start < points.length && !inBounds(points[start]);
        start++
    ) {
        // ok
    }
    let end = points.length - 1;
    for (end = points.length - 1; end > 0 && !inBounds(points[end]); end--) {
        // ok
    }
    return points.slice(start, end + 1);
};

export type Selected =
    | { type: 'road'; name: string; kind: string }
    | { type: 'place'; name: string };
const nbhNames: { [key: string]: string } = {
    'Jeff Vanderlou': 'Jeff-Vander-Lou',
    'Fairground Neighborhood': 'Fairground',
    'Covenant Blu-Grand Center': 'Covenant Blu Grand Center',
    'The Gate District': 'Gate District',
};

export const useLocalStorage = <T,>(
    key: string,
    initial: T,
): [T, (m: T | ((v: T) => T)) => void] => {
    const [value, setValue] = React.useState(() => {
        const raw = localStorage.getItem(key);
        if (raw) {
            return JSON.parse(raw);
        }
        return initial;
    });
    React.useEffect(() => {
        if (value !== initial) {
            localStorage.setItem(key, JSON.stringify(value));
        }
    }, [value]);
    return [value, setValue];
};
