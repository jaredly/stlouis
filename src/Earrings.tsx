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
import opentype, { Path } from 'opentype.js';
import { PathKit } from 'pathkit-wasm';
import { PuzzlePieces } from './PuzzlePieces';
import { calculateCenters } from './calculateCenters';
import { Download } from './Export';
import {
    combineNeighborhoods,
    combineNeighborhoodsPath,
    justWithinBounds,
    neighborhoodPolygons,
    pointsPath,
    showNeighborhoodOutlines,
    toStl,
} from './App';

export const Earrings = ({
    boundary,
    neighborhoods,
    PathKit,
    places,
    types,
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
    // const [selp, setSelp] = React.useState(null as null | string);
    // const [pos, setPos] = React.useState(null as null | Pos);
    // const [mini, setMini] = React.useState(false);

    const size = 4900;

    const bounds = React.useMemo(() => {
        let [x0, y0, x1, y1] = boundary.bbox!;
        return { x0, y0, x1, y1 };
    }, [boundary.bbox]);

    const scaleDown = 10;

    const w = 519;
    const dx = bounds.x1 - bounds.x0;
    const dy = bounds.y1 - bounds.y0;
    const h = (dy / dx) * w;
    const viewMargin = 30;

    const [rotate, setRotate] = React.useState(false);
    const rotW = rotate ? h : w;
    const rotH = rotate ? w : h;

    const fullWidth = (rotW + viewMargin * 2) / scaleDown;
    const fullHeight = (rotH + viewMargin * 2) / scaleDown;

    type Style = 'nbh' | 'roads' | 'clip';

    const [style, setStyle] = React.useState('nbh' as Style);

    const showPos = ([x, y]: Position) =>
        `${((x - bounds.x0) / dx) * w},${(1 - (y - bounds.y0) / dy) * h}`;

    const place = ([x, y]: Position) => [
        ((x - bounds.x0) / dx) * w,
        (1 - (y - bounds.y0) / dy) * h,
    ];
    const inBounds = ([x, y]: Position) =>
        bounds.x0 <= x && x <= bounds.x1 && bounds.y0 <= y && y <= bounds.y1;

    const [svgPath, mode, outline] = React.useMemo(() => {
        const size = 10;
        console.log('opping');
        const start = Date.now();

        // roads = the major roads
        // nbh   = neighborhoods
        // clip  = just the outline

        const clipPath = PathKit.NewPath();
        const shapePath = PathKit.NewPath();
        neighborhoodPolygons(neighborhoods, place)
            // .slice(30)
            .forEach((points) => {
                const inner = pointsPath(PathKit, points);
                clipPath.op(inner, PathKit.PathOp.UNION);
                const mid = inner.copy().stroke({
                    width: 1,
                    join: PathKit.StrokeJoin.ROUND,
                    cap: PathKit.StrokeCap.ROUND,
                });
                inner.stroke({
                    width: size,
                    join: PathKit.StrokeJoin.ROUND,
                    cap: PathKit.StrokeCap.ROUND,
                });
                inner.simplify();
                clipPath.op(mid, PathKit.PathOp.UNION);

                if (style === 'nbh') {
                    shapePath.op(inner, PathKit.PathOp.UNION);
                }

                inner.delete();
                mid.delete();
            });

        clipPath.simplify();

        let enlarge = clipPath.copy().stroke({
            width: size,
            // join: PathKit.StrokeJoin.ROUND,
            // cap: PathKit.StrokeCap.ROUND,
        });
        clipPath.op(enlarge, PathKit.PathOp.UNION);
        enlarge.delete();

        if (style === 'roads') {
            const t = ['trunk', 'motorway', 'primary'];

            t.forEach((k, ti) =>
                types[k].forEach((shape, i) => {
                    if (
                        shape.geometry.coordinates
                            .map(toStl.forward)
                            .some(inBounds)
                    ) {
                        console.log('a road', ti, i);
                        const inner = pointsPath(
                            PathKit,
                            justWithinBounds(
                                inBounds,
                                (shape.geometry as LineString).coordinates.map(
                                    toStl.forward,
                                ),
                            ).map(place),
                        );
                        inner.stroke({
                            width: sizes[k],
                            join: PathKit.StrokeJoin.ROUND,
                            cap: PathKit.StrokeCap.ROUND,
                        });
                        inner.op(clipPath, PathKit.PathOp.INTERSECT);
                        shapePath.op(inner, PathKit.PathOp.UNION);
                    }
                }),
            );
        }

        const outline = clipPath.toSVGString();

        enlarge = clipPath.copy().stroke({
            width: size / 2, // * 2,
            // join: PathKit.StrokeJoin.ROUND,
            // cap: PathKit.StrokeCap.ROUND,
        });
        clipPath.op(enlarge, PathKit.PathOp.UNION);
        enlarge.delete();

        clipPath.stroke({
            width: size * 2,
            //  join: PathKit.StrokeJoin.BEVEL
        });
        shapePath.op(clipPath, PathKit.PathOp.UNION);
        clipPath.delete();
        shapePath.simplify();
        const svg = shapePath.toSVGString();
        const mode = shapePath.getFillTypeString();
        shapePath.delete();
        const secs = (Date.now() - start) / 1000;
        console.log('opped', (secs / 60) | 0, 'min', secs % 60, 'seconds');

        // const path = combineNeighborhoodsPath(PathKit, neighborhoods, place, 1)
        return [svg, mode, outline];
    }, [neighborhoods, style]);

    const ref = React.useRef(null);

    return (
        <div>
            <div>
                <Download svg={ref} name="Earring" />
                {['nbh', 'roads', 'clip'].map((name) => (
                    <button key={name} onClick={() => setStyle(name as Style)}>
                        {name}
                    </button>
                ))}
            </div>
            <svg
                width={fullWidth + 'mm'}
                ref={ref}
                height={fullHeight + 'mm'}
                style={{ outline: '1px solid magenta', margin: 8 }}
                viewBox={`${-viewMargin} ${-viewMargin} ${
                    rotW + viewMargin * 2
                } ${rotH + viewMargin * 2}`}
                xmlns={'http://www.w3.org/2000/svg'}
            >
                <path
                    d={svgPath}
                    stroke="red"
                    strokeWidth={1}
                    fill="none"
                    fillRule={mode}
                />
                <path
                    d={outline}
                    stroke="blue"
                    strokeWidth={1}
                    fill="none"
                    // fillRule={mode}
                />
                <g
                // clipPath={'url(#rect-clip)'}
                // transform={rotate ? `rotate(-90) translate(${-w} 0)` : ''}
                >
                    {/* <g>
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
		</g> */}
                    {/* <g>
			{false &&
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
										sizes[k] || 0.2
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
				)}
		</g> */}
                    {/* <g>
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
		</g> */}
                    {/* <g>
                        {showNeighborhoodOutlines(
                            neighborhoods,
                            false,
                            null,
                            showPos,
                            1,
                        )}
                    </g> */}
                </g>
            </svg>
        </div>
    );
};

const sizes: { [key: string]: number } = {
    trunk: 20,
    motorway: 20,

    // primary: 10,
    // secondary: 2,
    // tertiary: 1,
    // residential: 0.5,

    primary: 20,
};
