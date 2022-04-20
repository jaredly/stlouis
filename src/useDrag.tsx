import * as React from 'react';
import { Pos } from './run';

export type MoveState = { pos: Pos; idx: number; origin: Pos };

export const useDrag = (
    onDrop: (state: MoveState) => void,
): [null | MoveState, (v: null | MoveState) => void] => {
    const [moving, setMoving] = React.useState(null as null | MoveState);
    React.useEffect(() => {
        if (!moving) return;
        const fn = (evt: MouseEvent) => {
            setMoving((m) =>
                m ? { ...m, pos: { x: evt.clientX, y: evt.clientY } } : m,
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
