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

const stlProj =
    'PROJCS["NAD_1983_StatePlane_Missouri_East_FIPS_2401_Feet",GEOGCS["GCS_North_American_1983",DATUM["D_North_American_1983",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",820208.3333333333],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",-90.5],PARAMETER["Scale_Factor",0.9999333333333333],PARAMETER["Latitude_Of_Origin",35.83333333333334],UNIT["Foot_US",0.3048006096012192]]';
const roadsPrj =
    'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]';

const toStl = proj4(roadsPrj, stlProj);
const fromStl = proj4(stlProj, roadsPrj);

const toShow = [
    'residential',
    'primary',
    'tertiary',
    'secondary',
    'motorway',
    'trunk',
];

const colors =
    'red orange green blue purple magenta teal gray black cyan pink #faf #faa'.split(
        ' ',
    );

type Pos = { x: number; y: number };

const roadScale = 0;

const sizes: { [key: string]: number } = {
    trunk: 6,
    motorway: 6,
    primary: 4,
    secondary: 2,
    tertiary: 1,
    residential: 0.5,
};

const App = ({
    types,
    boundary,
    places,
    fontUrl,
}: {
    types: { [key: string]: Array<Feature> };
    boundary: FeatureCollection;
    places: { [key: string]: Array<Feature> };
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
        .sort((a, b) => types[b].length - types[a].length)
        .filter(
            (t) =>
                t !== 'service' &&
                t !== 'footway' &&
                t !== 'pedestrian' &&
                t !== 'steps' &&
                t !== 'elevator' &&
                t !== 'living_street' &&
                t !== 'path',
        );
    // .filter((t) => toShow.includes(t));

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
                                backgroundColor: colors[ti % colors.length],
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
                {t.map((k, ti) =>
                    types[k].map((shape, i) => (
                        <polyline
                            fill="none"
                            key={ti + ':' + i}
                            // stroke={colors[ti % colors.length]}
                            stroke="red"
                            strokeWidth={sizes[k] || 0.5}
                            strokeLinecap="round"
                            points={(shape.geometry as LineString).coordinates
                                .map(toStl.forward)
                                .map(showPos)
                                .join(' ')}
                        />
                    )),
                )}
                {boundary.features.map((shape, i) => (
                    <polygon
                        fill="none"
                        key={i}
                        stroke={'red'}
                        strokeWidth={1}
                        points={(shape.geometry as Polygon).coordinates[0]
                            // .map(to)
                            // .map((pos) => proj4(stlProj, roadsPrj, pos))
                            .map(showPos)
                            .join(' ')}
                    />
                ))}
                {Object.keys(places).map(
                    (p, pi) =>
                        (!selp || selp === p) &&
                        places[p].map((place, i) => {
                            const [x, y] = scalePos(
                                toStl.forward(
                                    (place.geometry as Point).coordinates,
                                ),
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
                                        strokeWidth={3}
                                        strokeLinejoin="round"
                                        strokeLinecap="round"
                                    >
                                        {place.properties!.name}
                                    </text>
                                    <text
                                        x={x}
                                        y={y}
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
            </svg>
            <div>{JSON.stringify(pos)}</div>
        </div>
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
        fetch('./roads.json').then((r) => r.json()),
        fetch(
            '/data/Open_Sans/static/OpenSans_Condensed/OpenSans_Condensed-Light.ttf',
        )
            .then((r) => r.blob())
            .then((b) => {
                return new Promise((res) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(b);
                    reader.onloadend = () => res(reader.result);
                });
            }),
        getShp('./data/stl_boundary/stl_boundary'),
        getShp('./data/places'),
    ]);
    console.log('places', places);
    const pt: { [key: string]: Array<Feature> } = {};
    places.features.forEach((p) => {
        pt[p.properties!.type] = (pt[p.properties!.type] || []).concat([p]);
    });
    delete pt['yes'];
    delete pt['city'];
    delete pt['island'];
    delete pt['locality'];
    console.log(pt);
    root.render(
        <App types={roads} boundary={boundary} places={pt} fontUrl={fontUrl} />,
    );
};

run().catch(console.error);

function findBoundsFromRoads(types: { [key: string]: Array<Feature> }): {
    x0: number;
    y0: number;
    y1: number;
    x1: number;
} {
    return Object.keys(types).reduce(
        (bounds, k) =>
            types[k].reduce(
                (bounds, shape) =>
                    (shape.geometry as LineString).coordinates.reduce(
                        (bounds, [x, y]) => ({
                            x0: Math.min(x, bounds.x0),
                            y0: Math.min(y, bounds.y0),
                            x1: Math.max(x, bounds.x1),
                            y1: Math.max(y, bounds.y1),
                        }),
                        bounds,
                    ),
                bounds,
            ),
        { x0: Infinity, y0: Infinity, y1: -Infinity, x1: -Infinity },
    );
}
