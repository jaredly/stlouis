import * as React from 'react';
import { Pos } from './run';

export type MoveState = {
    pos: Pos;
    key: string;
    origin: Pos;
    moved: boolean;
    extra?: string;
};

const minDist = 200;

const dist = (a: Pos, b: Pos) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
};

export const useDrag = (
    onDrop: (state: MoveState) => void,
    backPos: (evt: { clientX: number; clientY: number }) => Pos,
): [null | MoveState, (v: null | MoveState) => void] => {
    const [moving, setMoving] = React.useState(null as null | MoveState);
    React.useEffect(() => {
        if (!moving) return;
        const fn = (evt: MouseEvent) => {
            setMoving((m) =>
                m
                    ? {
                          ...m,
                          pos: backPos(evt),
                          moved:
                              m.moved || dist(backPos(evt), m.origin) > minDist,
                      }
                    : m,
            );
        };
        document.addEventListener('mousemove', fn);
        const up = () => {
            setMoving((moving) => {
                if (moving) {
                    onDrop(moving);
                }
                return null;
            });
        };
        document.addEventListener('mouseup', up);

        return () => {
            document.removeEventListener('mousemove', fn);
            document.removeEventListener('mouseup', up);
        };
    }, [!!moving]);
    return [moving, setMoving];
};
