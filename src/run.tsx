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
import PathKitInit from 'pathkit-wasm';

const stlProj =
    'PROJCS["NAD_1983_StatePlane_Missouri_East_FIPS_2401_Feet",GEOGCS["GCS_North_American_1983",DATUM["D_North_American_1983",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",820208.3333333333],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",-90.5],PARAMETER["Scale_Factor",0.9999333333333333],PARAMETER["Latitude_Of_Origin",35.83333333333334],UNIT["Foot_US",0.3048006096012192]]';
const roadsPrj =
    'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]';

const toStl = proj4(roadsPrj, stlProj);
const fromStl = proj4(stlProj, roadsPrj);

// const toShow = [
//     'residential',
//     'primary',
//     'tertiary',
//     'secondary',
//     'motorway',
//     'trunk',
// ];

type Pos = { x: number; y: number };

const sizes: { [key: string]: number } = {
    trunk: 6,
    motorway: 6,
    primary: 4,
    secondary: 2,
    tertiary: 1,
    residential: 0.5,
};

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

    return (
        <div>
            Hmm
            <div>
                {Object.keys(places).map((p) => (
                    <button
                        key={p}
                        onClick={() => setSelp(selp === p ? null : p)}
                    >
                        {p} {places[p].length}
                    </button>
                ))}
            </div>
            <div style={{ display: 'flex' }}>
                {t.map((t, ti) => (
                    <div key={t}>
                        <div
                            style={{
                                width: 15,
                                height: 15,
                                display: 'inline-block',
                                border: selected === t ? '1px solid white' : '',
                            }}
                            onClick={() =>
                                setSelected(selected === t ? null : t)
                            }
                        />
                        {t} ({types[t].length})
                    </div>
                ))}
            </div>
            <svg
                width={w / 3 + 'mm'}
                height={h / 3 + 'mm'}
                viewBox={`${0} ${0} ${w} ${h}`}
                style={{ margin: 24 }}
                xmlns={'http://www.w3.org/2000/svg'}
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
                {boundary.features.map((shape, i) => (
                    <polygon
                        fill="none"
                        key={i}
                        stroke={'red'}
                        strokeWidth={1}
                        points={(shape.geometry as Polygon).coordinates[0]
                            .map(showPos)
                            .join(' ')}
                    />
                ))}
                {t.map((k, ti) =>
                    types[k].map((shape, i) => (
                        <polyline
                            fill="none"
                            key={ti + ':' + i}
                            stroke={getColor(k)}
                            strokeWidth={sizes[k] || 0.5}
                            strokeLinecap="round"
                            points={(shape.geometry as LineString).coordinates
                                .map(toStl.forward)
                                .map(showPos)
                                .join(' ')}
                        />
                    )),
                )}
                <ShowNames types={types} scalePos={scalePos} />
                <ShowPlaces places={places} selp={selp} scalePos={scalePos} />
            </svg>
            <div>{JSON.stringify(pos)}</div>
        </div>
    );
};

const ShowNames = ({
    types,
    scalePos,
}: {
    scalePos: (pos: Position) => Position;
    types: {
        [key: string]: Array<Feature<LineString>>;
    };
}) => {
    const used: { [key: string]: true } = {};
    return (
        <>
            {['trunk', 'motorway', 'primary'].map((k, ti) =>
                types[k].map((shape, i) => {
                    // if (used[shape.properties!.name]) {
                    //     return null;
                    // }
                    used[shape.properties!.name] = true;
                    const idx = Math.floor(
                        shape.geometry.coordinates.length / 2,
                    );
                    const [x, y] = scalePos(
                        toStl.forward(shape.geometry.coordinates[idx]),
                    );
                    const p2 =
                        shape.geometry.coordinates.length > idx + 1
                            ? scalePos(
                                  toStl.forward(
                                      shape.geometry.coordinates[idx + 1],
                                  ),
                              )
                            : null;
                    let theta = p2 ? Math.atan2(p2[1] - y, p2[0] - x) : 0;
                    if (theta > Math.PI / 2) {
                        theta -= Math.PI;
                    }
                    if (theta < -Math.PI / 2) {
                        theta += Math.PI;
                    }
                    console.log(theta);
                    return (
                        <React.Fragment key={i}>
                            <text
                                x={x}
                                y={y}
                                style={{
                                    fontSize: 4,
                                    textAnchor: 'middle',
                                    fontFamily: 'OpenSans',
                                    transformOrigin: `${x}px ${y}px`,
                                    transform: `rotate(${
                                        (theta / Math.PI) * 180
                                    }deg)`,
                                }}
                                // transform={`rotate(${
                                //     (theta / Math.PI) * 180
                                // }deg)`}
                                // transform={`rotate(45deg)`}
                                stroke="white"
                                fill="black"
                                strokeWidth={2}
                                strokeLinejoin="round"
                                strokeLinecap="round"
                            >
                                {shape.properties!.name}
                            </text>
                            <text
                                x={x}
                                y={y}
                                style={{
                                    fontSize: 4,
                                    textAnchor: 'middle',
                                    fontFamily: 'OpenSans',
                                    transformOrigin: `${x}px ${y}px`,
                                    // transform: `rotate(45deg)`,
                                    transform: `rotate(${
                                        (theta / Math.PI) * 180
                                    }deg)`,
                                }}
                                transform={`rotate(45deg)`}
                                fill="black"
                            >
                                {shape.properties!.name}
                            </text>
                        </React.Fragment>
                    );
                }),
            )}
        </>
    );
};

const ShowPlaces = ({
    places,
    scalePos,
    selp,
}: {
    selp: string | null;
    scalePos: (pos: Position) => Position;
    places: { [key: string]: Array<Feature<Point>> };
}) => {
    return (
        <>
            {Object.keys(places).map(
                (p, pi) =>
                    (!selp || selp === p) &&
                    places[p].map((place, i) => {
                        const [x, y] = scalePos(
                            toStl.forward(place.geometry.coordinates),
                        );
                        return (
                            <React.Fragment key={pi + ':' + i}>
                                <text
                                    x={x}
                                    y={y}
                                    style={{
                                        fontSize: 6,
                                        textAnchor: 'middle',
                                        fontFamily: 'OpenSans',
                                    }}
                                    stroke="white"
                                    fill="black"
                                    fontWeight={'bold'}
                                    strokeWidth={3}
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                >
                                    {place.properties!.name}
                                </text>
                                <text
                                    x={x}
                                    y={y}
                                    fontWeight={'bold'}
                                    style={{
                                        fontSize: 6,
                                        textAnchor: 'middle',
                                        fontFamily: 'OpenSans',
                                    }}
                                    fill="black"
                                >
                                    {place.properties!.name}
                                </text>
                            </React.Fragment>
                        );
                    }),
            )}
        </>
    );
};

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

// @ts-ignore
// const ctx = (window.canvas as HTMLCanvasElement).getContext('2d')!;
// ctx.canvas.style.display = 'block';
// const size = 500;
// ctx.canvas.width = size;
// ctx.canvas.height = size;
// ctx.canvas.style.width = size / 2 + 'px';
// ctx.canvas.style.height = size / 2 + 'px';

// PathKitInit({
//     locateFile: (file: string) => '/node_modules/pathkit-wasm/bin/' + file,
// }).then((PathKit) => {
//     // @ts-ignore
//     window.pk = PathKit;
//     console.log('yaya');
//     const orid = PathKit.NewPath()
//         .moveTo(10, 10)
//         .lineTo(30, 30)
//         .lineTo(40, 10)
//         .close();

//     const p = orid.copy().stroke({ width: 10, join: PathKit.StrokeJoin.ROUND });
//     const smalled = orid
//         .copy()
//         .stroke({ width: 5, join: PathKit.StrokeJoin.ROUND });
//     const oped = p.copy().op(smalled, PathKit.PathOp.DIFFERENCE);
//     ctx.fillStyle = 'orange';
//     ctx.fill(oped.toPath2D(), oped.getFillTypeString());
// });
