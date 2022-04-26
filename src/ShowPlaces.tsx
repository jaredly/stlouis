import * as React from 'react';
import {
    Feature,
    Position,
    Point,
    FeatureCollection,
    Polygon,
    MultiPolygon,
} from 'geojson';
import { useLocalStorage, empty, Pos, toStl, Selected } from './run';
import { useDrag } from './useDrag';
import { angleTo, RenderText } from './ShowNames';
import { createRoot } from 'react-dom/client';

const skip = []; //'Southhampton', 'Doctor Martin Luther King Drive'];

const findMid = (geo: Polygon | MultiPolygon) => {
    let x = 0;
    let y = 0;
    let n = 0;
    const follow = (path: Position[]) => {
        path.forEach(([a, b]) => {
            x += a;
            y += b;
            n++;
        });
    };
    if (geo.type === 'MultiPolygon') {
        geo.coordinates.forEach((paths) => paths.forEach(follow));
    } else {
        geo.coordinates.forEach(follow);
    }
    return { x: x / n, y: y / n };
};

export const ShowPlaces = ({
    places,
    scalePos,
    font,
    selp,
    inBounds,
    backPos,
    selected,
    setSelected,
}: {
    inBounds: (pos: Position) => boolean;
    font: opentype.Font;
    selp: string | null;
    scalePos: (pos: Position) => Position;
    places: FeatureCollection<Polygon | MultiPolygon>;
    backPos: (pos: { clientX: number; clientY: number }) => Pos;
    selected: Selected | null;
    setSelected: React.Dispatch<React.SetStateAction<Selected | null>>;
}) => {
    const [offsets, setOffsets] = useLocalStorage(
        'places-new',
        empty as {
            [key: string]: null | {
                x: number;
                y: number;
                rotate?: number;
                scale?: number;
                text?: string;
            };
        },
    );
    const [moving, setMoving] = useDrag((moving) => {
        if (!moving.moved) {
            return;
        }
        setOffsets((off) => {
            const r = { ...off };
            if (moving.extra === 'rotate') {
                r[moving.key] = {
                    ...moving.origin,
                    ...r[moving.key],
                    rotate: -angleTo(moving.origin, moving.pos),
                };
            } else {
                r[moving.key] = { ...r[moving.key], ...moving.pos };
            }
            return r;
        });
    }, backPos);

    const [editing, setEditing] = React.useState(null as null | string);

    React.useEffect(() => {
        if (!editing) return;
        const b = document.createElement('div');
        document.body.append(b);
        const root = createRoot(b);
        const Editor = () => {
            const [text, setText] = React.useState(
                offsets[editing]?.text ?? editing,
            );
            return (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: `rgba(0,0,0,0.2)`,
                    }}
                >
                    <textarea
                        onChange={(evt) => setText(evt.target.value)}
                        value={text}
                    />
                    <button
                        onClick={() => {
                            setOffsets((off) => {
                                const r = { ...off };
                                r[editing] = {
                                    ...r[editing]!,
                                    text: text,
                                };
                                return r;
                            });
                            setEditing(null);
                        }}
                    >
                        Save
                    </button>
                </div>
            );
        };
        root.render(<Editor />);
        return () => {
            setTimeout(() => {
                root.unmount();
                b.remove();
            }, 20);
        };
    }, [editing]);

    const seen: { [key: string]: true } = {};
    return (
        <>
            {places.features.map((neighborhood, i) => {
                const stl = findMid(neighborhood.geometry);
                if (!inBounds([stl.x, stl.y])) {
                    return;
                }
                const name = neighborhood.properties!.NHD_NAME;
                const key = name;
                if (seen[name]) {
                    return;
                }
                seen[name] = true;
                const position =
                    moving?.key === key && moving?.moved && !moving.extra
                        ? moving.pos
                        : offsets[key]?.x != null
                        ? offsets[key]!
                        : stl;
                const [x, y] = scalePos([position.x, position.y]);

                let rotate =
                    moving?.extra === 'rotate' &&
                    moving?.key === key &&
                    moving.moved
                        ? -angleTo(moving.origin, moving.pos)
                        : offsets[key]?.rotate ?? 0;

                return (
                    <g
                        onMouseDown={(evt) => {
                            if (evt.button !== 0) {
                                console.log('button', evt.button);
                                return;
                            }
                            if (evt.altKey) {
                                console.log('editing', name);
                                setEditing(name);
                                return;
                            }
                            const pos = backPos(evt);
                            setMoving({
                                origin: pos,
                                pos,
                                key,
                                moved: false,
                                extra: evt.shiftKey ? 'rotate' : undefined,
                            });
                            setSelected({ type: 'place', name });
                        }}
                        data-name={name}
                        key={name}
                        style={{
                            cursor: 'pointer',
                            userSelect: 'none',
                        }}
                        // transform={tx}
                    >
                        <RenderText
                            text={offsets[name]?.text ?? name}
                            x={x}
                            y={y}
                            fontSize={6}
                            bgColor={
                                selected?.type === 'place' &&
                                selected.name === name
                                    ? 'green'
                                    : 'white'
                            }
                            font={font}
                            transform={`rotate(${(rotate / Math.PI) * 180})`}
                        />
                        {/* <text
                                    x={x}
                                    y={y}
                                    style={{
                                        fontSize: 6,
                                        textAnchor: 'middle',
                                        fontFamily: 'OpenSans',
                                    }}
                                    stroke="white"
                                    fill="white"
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
                                </text> */}
                    </g>
                );
            })}
        </>
    );
};
