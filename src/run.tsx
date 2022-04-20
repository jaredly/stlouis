import * as React from 'react';
import { createRoot } from 'react-dom/client';
import * as shapefile from 'shapefile';
import {
    Feature,
    LineString,
    Polygon,
    Position,
    FeatureCollection,
    Point,
} from 'geojson';
import proj4 from 'proj4';
import { ShowNames } from './ShowNames';
import { ShowPlaces } from './ShowPlaces';
// import PathKitInit from 'pathkit-wasm';

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
    trunk: 6,
    motorway: 6,
    primary: 4,
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

    trunk: 'red',
    motorway: 'green',
    primary: 'blue',
    secondary: 'orange',
    tertiary: 'teal',
    residential: 'black',

    others: 'magenta',
};

const getColor = (type: string) =>
    // colors[k] || colors.others
    '#3a3';

const skip = [
    'service',
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

const App = ({
    types,
    boundary,
    places,
    fontUrl,
}: {
    types: { [key: string]: Array<Feature<LineString>> };
    boundary: FeatureCollection;
    places: { [key: string]: Array<Feature<Point>> };
    fontUrl: string;
}) => {
    const [scale, setScale] = React.useState({ dx: 0, dy: 0, x: 1, y: 1 });
    const [moving, setMoving] = React.useState();
    const [selected, setSelected] = React.useState(null as null | string);
    const [selp, setSelp] = React.useState(null as null | string);
    const [pos, setPos] = React.useState(null as null | Pos);
    const bounds = React.useMemo(() => {
        let [x0, y0, x1, y1] = boundary.bbox!;
        y1 = 1047986.8701159965;
        y0 = 989536.881186489;
        x1 = 911486.1515920038;
        return { x0, y0, x1, y1 };
    }, [boundary.bbox]);

    const w = 650;
    const dx = bounds.x1 - bounds.x0;
    const dy = bounds.y1 - bounds.y0;
    const h = (dy / dx) * w;

    const backPos = ({ x, y }: Pos) => ({
        x: (x / w) * dx + bounds.x0,
        y: (1 - y / h) * dy + bounds.y0,
    });

    const scalePos = ([x, y]: Position) => [
        ((x - bounds.x0) / dx) * w,
        (1 - (y - bounds.y0) / dy) * h,
    ];
    const showPos = ([x, y]: Position) =>
        `${((x - bounds.x0) / dx) * w},${(1 - (y - bounds.y0) / dy) * h}`;

    const t = Object.keys(types)
        .sort((a, b) => (sizes[b] || 0) - (sizes[a] || 0))
        .filter((t) => !skip.includes(t));

    const centers = React.useMemo(() => {
        return calculateCenters(types);
    }, [types]);

    const ref = React.useRef(null as null | SVGSVGElement);

    const [url, setUrl] = React.useState(null as null | string);

    return (
        <div>
            <div style={{ padding: 24, outline: '1px solid magenta' }}>
                <div>
                    {url ? (
                        <a
                            href={url}
                            download="map.svg"
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
                </div>
                <svg
                    width={(h + 20) / 3 + 'mm'}
                    height={(w + 20) / 3 + 'mm'}
                    viewBox={`${-10} ${-10} ${h + 20} ${w + 20}`}
                    xmlns={'http://www.w3.org/2000/svg'}
                    ref={(n) => {
                        ref.current = n;
                    }}
                    onClick={(evt) => {
                        const b = evt.currentTarget.getBoundingClientRect();
                        setPos(
                            backPos({
                                x: evt.clientX - b.left,
                                y: evt.clientY - b.top,
                            }),
                        );
                    }}
                >
                    <clipPath id="rect-clip">
                        <rect x={0} y={0} width={w} height={h} />
                    </clipPath>
                    <defs>
                        <style
                            dangerouslySetInnerHTML={{
                                __html: `
						@font-face {
							font-family: 'OpenSans';
							src: url('data:font/ttf;${fontUrl}');
							font-style: normal;
						}
					`,
                            }}
                        />
                    </defs>
                    <rect
                        x={-10}
                        y={-10}
                        width={h + 20}
                        height={w + 20}
                        fill="none"
                        stroke="red"
                        strokeWidth={1}
                    />
                    <g
                        clipPath="url(#rect-clip)"
                        transform={`rotate(-90) translate(${-w} 0)`}
                    >
                        {/* {boundary.features.map((shape, i) => (
                        <polygon
                            fill="none"
                            key={i}
                            stroke={'red'}
                            strokeWidth={1}
                            points={(shape.geometry as Polygon).coordinates[0]
                                .map(showPos)
                                .join(' ')}
                        />
                    ))} */}
                        <g>
                            {t.map((k, ti) =>
                                types[k].map((shape, i) => (
                                    <polyline
                                        fill="none"
                                        key={ti + ':' + i}
                                        stroke={getColor(k)}
                                        strokeWidth={sizes[k] || 0.5}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        points={(
                                            shape.geometry as LineString
                                        ).coordinates
                                            .map(toStl.forward)
                                            .map(showPos)
                                            .join(' ')}
                                    />
                                )),
                            )}
                        </g>
                        <g>
                            <ShowNames
                                types={types}
                                scalePos={scalePos}
                                centers={centers}
                            />
                        </g>
                        <g>
                            <ShowPlaces
                                places={places}
                                selp={selp}
                                scalePos={scalePos}
                            />
                        </g>
                    </g>
                </svg>
            </div>
            <div>{JSON.stringify(pos)}</div>
        </div>
    );
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

const getShp = (name: string) => {
    return Promise.all([
        fetch(name + '.shp').then((r) => r.arrayBuffer()),
        fetch(name + '.dbf').then((r) => r.arrayBuffer()),
    ]).then(([shp, dbf]) => {
        return shapefile.read(shp, dbf);
    });
};

const run = async () => {
    const [roads, fontUrl, boundary, places] = await Promise.all([
        fetch('./roads.json').then(
            (r): Promise<{ [key: string]: Array<Feature<LineString>> }> =>
                r.json(),
        ),
        fetch(
            '/data/Open_Sans/static/OpenSans_Condensed/OpenSans_Condensed-Light.ttf',
        )
            .then((r) => r.blob())
            .then((b): Promise<string> => {
                return new Promise((res) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(b);
                    reader.onloadend = () => res(reader.result as string);
                });
            }),
        getShp('./data/stl_boundary/stl_boundary'),
        getShp('./data/places'),
        // PathKitInit({
        //     locateFile: (file: string) =>
        //         '/node_modules/pathkit-wasm/bin/' + file,
        // }),
    ]);

    const placeTypes: { [key: string]: Array<Feature<Point>> } = {};
    places.features.forEach((p) => {
        const type = p.properties!.type;
        placeTypes[type] = (placeTypes[type] || []).concat([
            p as Feature<Point>,
        ]);
    });
    delete placeTypes['yes'];
    delete placeTypes['city'];
    delete placeTypes['island'];
    delete placeTypes['locality'];

    console.log(placeTypes);
    root.render(
        <App
            types={roads}
            boundary={boundary}
            places={placeTypes}
            fontUrl={fontUrl}
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
            let closest = null as
                | null
                | [number, Feature<LineString>, Pos, Position, Position];
            byName[name].forEach((feature) => {
                if (feature.geometry.coordinates.length < 2) {
                    return;
                }
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
            centers[key + ':' + name] = { center, closest: closest! };
        });
    });
    return centers;
}
