import * as React from 'react';
import { createRoot } from 'react-dom/client';
import * as shapefile from 'shapefile';
import {
    Feature,
    LineString,
    Polygon,
    MultiPolygon,
    Position,
    FeatureCollection,
    Point,
    Geometry,
    GeoJsonProperties,
} from 'geojson';
import proj4 from 'proj4';
import { ShowNames } from './ShowNames';
import { ShowPlaces } from './ShowPlaces';
import opentype from 'opentype.js';
import PathKitInit from 'pathkit-wasm';

const stlProj =
    'PROJCS["NAD_1983_StatePlane_Missouri_East_FIPS_2401_Feet",GEOGCS["GCS_North_American_1983",DATUM["D_North_American_1983",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",820208.3333333333],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",-90.5],PARAMETER["Scale_Factor",0.9999333333333333],PARAMETER["Latitude_Of_Origin",35.83333333333334],UNIT["Foot_US",0.3048006096012192]]';
const roadsPrj =
    'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]';

export const toStl = proj4(roadsPrj, stlProj);
const fromStl = proj4(stlProj, roadsPrj);

const dist = (a: Pos, b: Pos) => {
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

    // trunk: 'red',
    // motorway: 'green',
    // primary: 'blue',
    // secondary: 'orange',
    // tertiary: 'teal',
    // residential: 'black',

    // others: 'magenta',
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

const App = ({
    types,
    boundary,
    places,
    neighborhoods,
    font,
    headerFont,
    natural,
}: {
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
                                let contents = ref.current!.outerHTML;
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
                            {t.map(
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
                                                    selected?.type === 'road' &&
                                                    selected.kind === k &&
                                                    selected.name ===
                                                        shape.properties!.name
                                                        ? '#3f3'
                                                        : getColor(k)
                                                }
                                                strokeWidth={sizes[k] || 0.5}
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
                            )}
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

export const empty = {};

const root = createRoot(document.getElementById('root')!);

const getShp = <T extends Geometry | null = Geometry, P = GeoJsonProperties>(
    name: string,
): Promise<FeatureCollection<T, P>> => {
    return Promise.all([
        fetch(name + '.shp').then((r) => r.arrayBuffer()),
        fetch(name + '.dbf').then((r) => r.arrayBuffer()),
    ]).then(([shp, dbf]) => {
        return shapefile.read(shp, dbf);
    }) as Promise<FeatureCollection<T, P>>;
};

const run = async () => {
    const [
        roads,
        font,
        headerFont,
        boundary,
        places,
        neighborhoods,
        waterways,
        natural,
        PathKit,
    ] = await Promise.all([
        fetch('./roads.json').then(
            (r): Promise<{ [key: string]: Array<Feature<LineString>> }> =>
                r.json(),
        ),
        opentype.load(
            '/data/Open_Sans/static/OpenSans_Condensed/OpenSans_Condensed-Regular.ttf',
        ),
        opentype.load(
            '/data/Open_Sans/static/OpenSans_Condensed/OpenSans_Condensed-Bold.ttf',
        ),
        getShp('./data/stl_boundary/stl_boundary'),
        getShp('./data/places'),
        getShp<Polygon | MultiPolygon>(
            './data/nbrhds_wards/Neighborhood_Boundaries',
        ),
        getShp<LineString>('./data/waterways'),
        getShp<Polygon>('./data/natural'),
        PathKitInit({
            locateFile: (file: string) =>
                '/node_modules/pathkit-wasm/bin/' + file,
            // '/bin/' + file,
        }),
    ]);
    // console.log(natural);

    const placeTypes: { [key: string]: Array<Feature<Point>> } = {};
    places.features.forEach((p) => {
        const type = p.properties!.type;
        placeTypes[type] = (placeTypes[type] || []).concat([
            p as Feature<Point>,
        ]);
    });
    // window.places = places;
    delete placeTypes['yes'];
    delete placeTypes['city'];
    delete placeTypes['island'];
    delete placeTypes['locality'];

    delete placeTypes['hamlet'];
    delete placeTypes['town'];
    delete placeTypes['village'];
    console.log(boundary);

    // let [x0, y0, x1, y1] = boundary.bbox!;
    // const bounds = { x0, y0, x1, y1 };

    // const w = 519;
    // const dx = bounds.x1 - bounds.x0;
    // const dy = bounds.y1 - bounds.y0;
    // const h = (dy / dx) * w;

    // const px = (x: number) => ((x - bounds.x0) / dx) * w;
    // const py = (y: number) => (1 - (y - bounds.y0) / dy) * h;
    // // const showPos = ([x, y]: Position) =>
    // //     `${((x - bounds.x0) / dx) * w},${(1 - (y - bounds.y0) / dy) * h}`;

    // const addPoly = (path: Position[]) => {
    //     const inner = PathKit.NewPath();
    //     path.forEach((coord, i) => {
    //         if (i === 0) {
    //             inner.moveTo(px(coord[0]), py(coord[1]));
    //         } else {
    //             inner.lineTo(px(coord[0]), py(coord[1]));
    //         }
    //     });
    //     inner.close();
    //     allBoundary.op(inner, PathKit.PathOp.UNION);
    //     inner.delete();
    // };

    // const allBoundary = PathKit.NewPath();
    // neighborhoods.features.forEach((feature) => {
    //     if (feature.geometry.type === 'Polygon') {
    //         feature.geometry.coordinates.forEach(addPoly);
    //     } else {
    //         feature.geometry.coordinates.forEach((paths) =>
    //             paths.forEach(addPoly),
    //         );
    //     }
    // });
    // // allBoundary.simplify();
    // // allBoundary.setFillType(PathKit.FillType.EVENODD);
    // const boundaryPath = allBoundary.toSVGString();
    // const expanded = allBoundary
    //     .copy()
    //     .stroke({ width: 20, join: PathKit.StrokeJoin.ROUND });
    // allBoundary.op(expanded, PathKit.PathOp.UNION);
    // expanded.delete();
    // const expandedPath = allBoundary.toSVGString();
    // allBoundary.delete();

    root.render(
        <App
            types={roads}
            boundary={boundary}
            places={placeTypes}
            font={font}
            headerFont={headerFont}
            neighborhoods={neighborhoods}
            waterways={waterways}
            natural={natural}
            // boundaryPath={boundaryPath}
            // expandedPath={expandedPath}
            // PathKit={PathKit}
        />,
    );
};

run().catch(console.error);

function calculateCenters(types: {
    [key: string]: Array<Feature<LineString>>;
}) {
    const centers: Centers = {};
    labeled.forEach((key) => {
        const byName: { [key: string]: Array<Feature<LineString>> } = {};
        types[key].forEach((feature) => {
            const name = feature.properties!.name;
            if (!byName[name]) {
                byName[name] = [feature];
            } else {
                byName[name].push(feature);
            }
        });
        Object.keys(byName).forEach((name) => {
            let n = 0;
            let px = 0;
            let py = 0;
            byName[name].forEach((feature) => {
                feature.geometry.coordinates.forEach(([x, y]) => {
                    n++;
                    px += x;
                    py += y;
                });
            });
            px /= n;
            py /= n;
            const center = { x: px, y: py };
            let totalLength = 0;
            let closest = null as
                | null
                | [number, Feature<LineString>, Pos, Position, Position];
            byName[name].forEach((feature) => {
                if (feature.geometry.coordinates.length < 2) {
                    return;
                }

                feature.geometry.coordinates.slice(1).forEach((coord, i) => {
                    const last = feature.geometry.coordinates[i];
                    const p1 = toStl.forward(last);
                    const p2 = toStl.forward(coord);
                    const dx = p1[0] - p2[0];
                    const dy = p1[1] - p2[1];
                    totalLength += Math.sqrt(dx * dx + dy * dy);
                });

                const midx = Math.floor(
                    (feature.geometry.coordinates.length - 1) / 2,
                );
                const p1 = feature.geometry.coordinates[midx];
                const p2 = feature.geometry.coordinates[midx + 1];
                const mid = {
                    x: (p1[0] + p2[0]) / 2,
                    y: (p1[1] + p2[1]) / 2,
                };
                const d = dist(center, mid);
                if (closest === null || d < closest[0]) {
                    closest = [d, feature, mid, p1, p2];
                }
            });
            centers[key + ':' + name] = {
                center,
                closest: closest!,
                totalLength,
            };
        });
    });
    return centers;
}
